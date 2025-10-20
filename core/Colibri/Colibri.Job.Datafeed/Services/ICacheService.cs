namespace Colibri.Job.Datafeed.Services;

public interface ICacheService
{
    Task<T?> GetOrCreateAsync<T>(string cacheKey, Func<Task<T>> factory, TimeSpan expiration);
    Task SetAsync<T>(string cacheKey, T value, TimeSpan expiration);
    Task<T?> GetAsync<T>(string cacheKey);
    Task<bool> ExistsAsync(string cacheKey);
    Task RemoveAsync(string cacheKey);
}