using System;

namespace Colibri.Job.Datafeed.Services;

public interface IDataSourceCacheService
{
    Task<Dictionary<string, object>?> GetCachedDataAsync(
        string sourceName,
        Dictionary<string, object> compositeKey,
        CancellationToken cancellationToken = default);

    Task CacheDataSourceAsync(
        string sourceName,
        List<Dictionary<string, object>> data,
        List<string> compositeKeyFields,
        Dictionary<string, string>? compositeKeyMapping,
        TimeSpan expiration,
        CancellationToken cancellationToken = default);

    Task<bool> IsCachedAsync(string sourceName, CancellationToken cancellationToken = default);

    Task InvalidateCacheAsync(string sourceName, CancellationToken cancellationToken = default);
}
