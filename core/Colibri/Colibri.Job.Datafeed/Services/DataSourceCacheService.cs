using Colibri.Job.Datafeed.Services;
using Microsoft.Extensions.Logging;

namespace Colibri.Job.Datafeed.Services;

public class DataSourceCacheService : IDataSourceCacheService
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<DataSourceCacheService> _logger;
    private const string CACHE_PREFIX = "datasource";

    public DataSourceCacheService(
        ICacheService cacheService,
        ILogger<DataSourceCacheService> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<Dictionary<string, object>?> GetCachedDataAsync(
        string sourceName,
        Dictionary<string, object> compositeKey,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = BuildCacheKey(sourceName, compositeKey);

        var cachedData = await _cacheService.GetAsync<Dictionary<string, object>>(cacheKey);

        if (cachedData != null)
        {
            _logger.LogDebug("Cache hit for data source: {SourceName}, key: {CacheKey}", sourceName, cacheKey);
        }
        else
        {
            _logger.LogDebug("Cache miss for data source: {SourceName}, key: {CacheKey}", sourceName, cacheKey);
        }

        return cachedData;
    }

    public async Task CacheDataSourceAsync(
            string sourceName,
            List<Dictionary<string, object>> data,
            List<string> datasourceCompositeKeyFields,
            Dictionary<string, string>? compositeKeyMapping,
            TimeSpan expiration,
            CancellationToken cancellationToken = default)
    {
        if (data == null || !data.Any())
        {
            _logger.LogWarning("No data to cache for data source: {SourceName}", sourceName);
            return;
        }

        var cachedCount = 0;
        var skippedCount = 0;

        foreach (var row in data)
        {
            // Build composite key from the datasource row
            // datasourceCompositeKeyFields already contains the actual datasource field names
            var compositeKey = new Dictionary<string, object>();

            foreach (var datasourceField in datasourceCompositeKeyFields)
            {
                // Try to get the value from the datasource row
                if (row.TryGetValue(datasourceField, out var value))
                {
                    if (value == null || (value is string str && string.IsNullOrWhiteSpace(str)))
                    {
                        _logger.LogTrace("Composite key field '{DatasourceField}' is null or empty in row for {SourceName}",
                            datasourceField, sourceName);
                        skippedCount++;
                        break; // Skip this row
                    }

                    compositeKey[datasourceField] = value;
                }
                else
                {
                    _logger.LogWarning("Composite key field '{DatasourceField}' not found in datasource row for {SourceName}. Available fields: {AvailableFields}",
                        datasourceField, sourceName, string.Join(", ", row.Keys));
                    skippedCount++;
                    break; // Skip this row
                }
            }

            // Only cache if we successfully built the complete composite key
            if (compositeKey.Count == datasourceCompositeKeyFields.Count)
            {
                var cacheKey = BuildCacheKey(sourceName, compositeKey);
                await _cacheService.SetAsync(cacheKey, row, expiration);
                cachedCount++;

                if (cachedCount <= 3) // Log first 3 for debugging
                {
                    var keyDetails = string.Join(", ", compositeKey.Select(kvp => $"{kvp.Key}={kvp.Value}"));
                    _logger.LogDebug("Cached row {Count} with key: {CacheKey} ({Details}) for {SourceName}",
                        cachedCount, cacheKey, keyDetails, sourceName);
                }
            }
        }

        // Cache metadata to track that this source has been cached
        var metadataKey = $"{CACHE_PREFIX}:metadata:{sourceName}";
        var metadata = new
        {
            CachedAt = DateTime.UtcNow,
            RowCount = cachedCount,
            SkippedCount = skippedCount,
            CompositeKeyFields = datasourceCompositeKeyFields,
            CompositeKeyMapping = compositeKeyMapping
        };
        await _cacheService.SetAsync(metadataKey, metadata, expiration);

        _logger.LogInformation("Cached {CachedCount} rows for data source: {SourceName} (Skipped: {SkippedCount})",
            cachedCount, sourceName, skippedCount);
    }

    public async Task<bool> IsCachedAsync(string sourceName, CancellationToken cancellationToken = default)
    {
        var metadataKey = $"{CACHE_PREFIX}:metadata:{sourceName}";
        return await _cacheService.ExistsAsync(metadataKey);
    }

    public async Task InvalidateCacheAsync(string sourceName, CancellationToken cancellationToken = default)
    {
        var metadataKey = $"{CACHE_PREFIX}:metadata:{sourceName}";
        await _cacheService.RemoveAsync(metadataKey);

        _logger.LogInformation("Invalidated cache for data source: {SourceName}", sourceName);
    }

    private string BuildCacheKey(string sourceName, Dictionary<string, object> compositeKey)
    {
        var keyParts = new List<string> { CACHE_PREFIX, sourceName };

        // Sort by key name for consistency
        foreach (var kvp in compositeKey.OrderBy(k => k.Key))
        {
            keyParts.Add($"{kvp.Key}:{kvp.Value}");
        }

        return string.Join(":", keyParts);
    }
}
