using Colibri.Job.Datafeed.Models;
using Colibri.Job.Datafeed.Processor;
using Colibri.Job.Datafeed.Services;
using Microsoft.Extensions.Logging;

namespace Colibri.Job.Datafeed.Processor;

public class AzureMessageProcessor : IMessageProcessor<DataSourceConfiguration>
{
    private readonly ILogger<AzureMessageProcessor> _logger;
    private readonly ICsvProcessor _csvProcessor;
    private readonly ITableStorageService _tableStorageService;
    private readonly IDataSourceCacheService _dataSourceCacheService;
    private readonly IDistributedLockService _distributedLockService;

    public AzureMessageProcessor(
        ICsvProcessor csvProcessor,
        ITableStorageService tableStorageService,
        IDataSourceCacheService dataSourceCacheService,
        IDistributedLockService distributedLockService,
        ILogger<AzureMessageProcessor> logger)
    {
        _csvProcessor = csvProcessor;
        _tableStorageService = tableStorageService;
        _dataSourceCacheService = dataSourceCacheService;
        _distributedLockService = distributedLockService;
        _logger = logger;
    }

    public async Task ProcessMessageAsync(DataSourceConfiguration message, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Processing DataSourceConfiguration message");

        try
        {
            // Step 1: Check and refresh caches for CSV and Database data sources
            if (message.ApiEndpoints?.Datasources != null)
            {
                foreach (var endpoint in message.ApiEndpoints.Datasources)
                {
                    // Only pre-cache CSV and Database sources, APIs are cached on-demand
                    if (endpoint.SourceType.Equals("CSV", StringComparison.OrdinalIgnoreCase) ||
                        endpoint.SourceType.Equals("Database", StringComparison.OrdinalIgnoreCase))
                    {
                        await EnsureDataSourceCachedAsync(endpoint, message.LockConfiguration, cancellationToken);
                    }
                }
            }

            // Step 2: Process the main CSV file with all data sources ready
            await _csvProcessor.ProcessCsvFileAsync(message, cancellationToken);

            _logger.LogInformation("Successfully processed DataSourceConfiguration message");
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Processing cancelled");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing DataSourceConfiguration message");
            throw;
        }
    }

    private async Task EnsureDataSourceCachedAsync(
           ApiEndpoint endpoint,
           LockConfiguration lockConfig,
           CancellationToken cancellationToken)
    {
        var sourceName = endpoint.Name;
        var sourceType = endpoint.SourceType.ToUpper();

        _logger.LogInformation("Checking cache status for {SourceType} data source: {SourceName}",
            sourceType, sourceName);

        try
        {
            // Check if refresh is needed from Azure Table Storage
            var shouldRefresh = await _tableStorageService.ShouldRefreshCacheAsync(
                sourceType,
                sourceName,
                cancellationToken);

            var isCached = await _dataSourceCacheService.IsCachedAsync(sourceName, cancellationToken);

            if (shouldRefresh || !isCached)
            {
                _logger.LogInformation("Cache refresh needed for {SourceType}: {SourceName}",
                    sourceType, sourceName);

                if (lockConfig.EnableDistributedLock)
                {
                    // Use distributed lock to prevent multiple pods from refreshing simultaneously
                    var lockKey = $"cache-refresh:{sourceType}:{sourceName}";

                    var lockAcquired = await _distributedLockService.ExecuteWithLockAsync(
                        lockKey,
                        async () =>
                        {
                            // Double-check if cache is still needed after acquiring lock
                            // Another pod might have already refreshed it
                            var stillNeedRefresh = await _tableStorageService.ShouldRefreshCacheAsync(
                                sourceType,
                                sourceName,
                                cancellationToken);

                            var stillNotCached = !await _dataSourceCacheService.IsCachedAsync(
                                sourceName,
                                cancellationToken);

                            if (stillNeedRefresh || stillNotCached)
                            {
                                _logger.LogInformation(
                                    "Acquired lock, proceeding with cache refresh for {SourceType}: {SourceName}",
                                    sourceType, sourceName);

                                // Load and cache the data source
                                await LoadAndCacheDataSourceAsync(endpoint, cancellationToken);

                                // Update the table storage to reflect refresh complete
                                await _tableStorageService.UpdateLastRefreshedAsync(
                                    sourceType,
                                    sourceName,
                                    cancellationToken);

                                _logger.LogInformation("Successfully cached {SourceType}: {SourceName}",
                                    sourceType, sourceName);
                            }
                            else
                            {
                                _logger.LogInformation(
                                    "Another pod already refreshed the cache for {SourceType}: {SourceName}",
                                    sourceType, sourceName);
                            }
                        },
                        lockConfig.WaitTimeSeconds,
                        lockConfig.LockExpirySeconds,
                        cancellationToken);

                    if (!lockAcquired)
                    {
                        _logger.LogWarning(
                            "Could not acquire lock for {SourceType}: {SourceName}. " +
                            "Another pod is likely refreshing the cache. Will use existing cache if available.",
                            sourceType, sourceName);

                        // Check if cache is now available (another pod might have refreshed it)
                        if (!await _dataSourceCacheService.IsCachedAsync(sourceName, cancellationToken))
                        {
                            throw new InvalidOperationException(
                                $"Cache refresh required but lock could not be acquired and cache is not available for {sourceType}/{sourceName}");
                        }
                    }
                }
                else
                {
                    // No distributed lock - proceed directly (not recommended for production with multiple pods)
                    _logger.LogWarning(
                        "Distributed lock is disabled. Proceeding without lock for {SourceType}: {SourceName}",
                        sourceType, sourceName);

                    await LoadAndCacheDataSourceAsync(endpoint, cancellationToken);

                    await _tableStorageService.UpdateLastRefreshedAsync(
                        sourceType,
                        sourceName,
                        cancellationToken);

                    _logger.LogInformation("Successfully cached {SourceType}: {SourceName}",
                        sourceType, sourceName);
                }
            }
            else
            {
                _logger.LogInformation("{SourceType} data source already cached: {SourceName}",
                    sourceType, sourceName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ensuring data source cached: {SourceType}/{SourceName}",
                sourceType, sourceName);
            throw;
        }
    }

    private async Task LoadAndCacheDataSourceAsync(ApiEndpoint endpoint, CancellationToken cancellationToken)
    {
        if (endpoint.SourceType.Equals("CSV", StringComparison.OrdinalIgnoreCase))
        {
            await LoadAndCacheCsvDataSourceAsync(endpoint, cancellationToken);
        }
        else if (endpoint.SourceType.Equals("Database", StringComparison.OrdinalIgnoreCase))
        {
            await LoadAndCacheDatabaseDataSourceAsync(endpoint, cancellationToken);
        }
    }

    private async Task LoadAndCacheCsvDataSourceAsync(ApiEndpoint endpoint, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Loading CSV data source from: {FilePath}", endpoint.FilePath);

        // Use CSV processor to read the file
        var data = await _csvProcessor.ReadCsvDataSourceAsync(endpoint, cancellationToken);

        // Build the datasource composite key fields (after mapping)
        var datasourceCompositeKeyFields = new List<string>();

        if (endpoint.CompositeKey != null)
        {
            foreach (var inputField in endpoint.CompositeKey)
            {
                // Check if there's a mapping for this field
                if (endpoint.CompositeKeyMapping != null &&
                    endpoint.CompositeKeyMapping.TryGetValue(inputField, out var mappedField))
                {
                    // Use the mapped (datasource) field name
                    datasourceCompositeKeyFields.Add(mappedField);
                    _logger.LogDebug("Composite key field mapping for caching: {InputField} -> {DatasourceField}",
                        inputField, mappedField);
                }
                else
                {
                    // No mapping, use the input field name as-is
                    datasourceCompositeKeyFields.Add(inputField);
                }
            }
        }

        // Cache the data with the datasource field names
        var expiration = TimeSpan.FromMinutes(endpoint.CacheDurationMinutes);
        await _dataSourceCacheService.CacheDataSourceAsync(
            endpoint.Name,
            data,
            datasourceCompositeKeyFields,
            endpoint.CompositeKeyMapping,
            expiration,
            cancellationToken);

        _logger.LogInformation("Cached {Count} rows from CSV data source: {Name}",
            data.Count, endpoint.Name);
    }

    private async Task LoadAndCacheDatabaseDataSourceAsync(ApiEndpoint endpoint, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Loading Database data source: {Name}", endpoint.Name);

        // Load database data (to be implemented with database service)
        var data = await _csvProcessor.ReadDatabaseDataSourceAsync(endpoint, cancellationToken);

        // Cache the data
        var expiration = TimeSpan.FromMinutes(endpoint.CacheDurationMinutes);
        await _dataSourceCacheService.CacheDataSourceAsync(
            endpoint.Name,
            data,
            endpoint.Parameters ?? [],
            endpoint.CompositeKeyMapping,
            expiration,
            cancellationToken);

        _logger.LogInformation("Cached {Count} rows from Database data source: {Name}",
            data.Count, endpoint.Name);
    }
}

