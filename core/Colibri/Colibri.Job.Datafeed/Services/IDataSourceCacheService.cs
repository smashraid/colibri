namespace Colibri.Job.Datafeed.Services;

public interface IDataSourceCacheService
{
    /// <summary>
    /// Caches data source with composite key
    /// </summary>
    Task CacheDataSourceAsync(
        string datasourceName,
        List<Dictionary<string, object>> data,
        List<string> compositeKeyFields,
        Dictionary<string, string>? fieldMapping,
        TimeSpan expiration,
        CancellationToken cancellationToken);

    /// <summary>
    /// Gets cached data by datasource name and composite key
    /// </summary>
    Task<Dictionary<string, object>?> GetCachedDataAsync(
        string datasourceName,
        Dictionary<string, object> compositeKey,
        CancellationToken cancellationToken);

    /// <summary>
    /// Gets cached data by direct cache key (generated from template)
    /// </summary>
    Task<Dictionary<string, object>?> GetByKeyAsync(
        string cacheKey,
        CancellationToken cancellationToken);

    /// <summary>
    /// Checks if datasource is cached
    /// </summary>
    Task<bool> IsCachedAsync(
        string datasourceName,
        CancellationToken cancellationToken);
}