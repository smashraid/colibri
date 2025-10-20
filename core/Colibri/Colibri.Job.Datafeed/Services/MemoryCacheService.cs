using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Colibri.Job.Datafeed.Services;

public class MemoryCacheService : ICacheService, IDisposable
{
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<MemoryCacheService> _logger;
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _keyLocks;
    private readonly Timer _cleanupTimer;
    private bool _disposed;

    public MemoryCacheService(
        IMemoryCache memoryCache,
        ILogger<MemoryCacheService> logger)
    {
        _memoryCache = memoryCache;
        _logger = logger;
        _keyLocks = new ConcurrentDictionary<string, SemaphoreSlim>();

        // Cleanup orphaned locks every 5 minutes
        _cleanupTimer = new Timer(CleanupOrphanedLocks, null,
            TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
    }

    public async Task<T?> GetOrCreateAsync<T>(string cacheKey, Func<Task<T>> factory, TimeSpan expiration)
    {
        // Try cache first
        if (_memoryCache.TryGetValue(cacheKey, out T? cachedValue))
        {
            _logger.LogDebug("Cache hit: {CacheKey}", cacheKey);
            return cachedValue;
        }

        // Get or create lock for this key
        var keyLock = _keyLocks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));

        await keyLock.WaitAsync();

        try
        {
            // Double-check after acquiring lock
            if (_memoryCache.TryGetValue(cacheKey, out cachedValue))
            {
                _logger.LogDebug("Cache hit (after lock): {CacheKey}", cacheKey);
                return cachedValue;
            }

            _logger.LogDebug("Cache miss: {CacheKey}", cacheKey);

            var value = await factory();

            // Set cache with expiration callback to clean up lock
            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(expiration)
                .RegisterPostEvictionCallback((key, value, reason, state) =>
                {
                    // Clean up lock when cache entry is evicted
                    if (key is string cacheKey && _keyLocks.TryRemove(cacheKey, out var semaphore))
                    {
                        semaphore?.Dispose();
                        _logger.LogTrace("Cleaned up lock for evicted cache key: {CacheKey}", cacheKey);
                    }
                });

            _memoryCache.Set(cacheKey, value, cacheEntryOptions);

            return value;
        }
        finally
        {
            keyLock.Release();
        }
    }

    public Task SetAsync<T>(string cacheKey, T value, TimeSpan expiration)
    {
        var cacheEntryOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(expiration)
            .RegisterPostEvictionCallback((key, value, reason, state) =>
            {
                // Clean up lock when cache entry is evicted
                if (key is string cacheKey && _keyLocks.TryRemove(cacheKey, out var semaphore))
                {
                    semaphore?.Dispose();
                    _logger.LogTrace("Cleaned up lock for evicted cache key: {CacheKey}", cacheKey);
                }
            });

        _memoryCache.Set(cacheKey, value, cacheEntryOptions);
        return Task.CompletedTask;
    }

    public Task<T?> GetAsync<T>(string cacheKey)
    {
        if (_memoryCache.TryGetValue(cacheKey, out T? value))
            return Task.FromResult(value);

        return Task.FromResult(default(T));
    }

    public Task<bool> ExistsAsync(string cacheKey)
    {
        return Task.FromResult(_memoryCache.TryGetValue(cacheKey, out _));
    }

    public Task RemoveAsync(string cacheKey)
    {
        _memoryCache.Remove(cacheKey);

        // Clean up associated lock
        if (_keyLocks.TryRemove(cacheKey, out var semaphore))
        {
            semaphore?.Dispose();
            _logger.LogTrace("Cleaned up lock for removed cache key: {CacheKey}", cacheKey);
        }

        return Task.CompletedTask;
    }

    private void CleanupOrphanedLocks(object? state)
    {
        try
        {
            var orphanedKeys = new List<string>();

            foreach (var kvp in _keyLocks)
            {
                // If cache doesn't have the key but lock exists, it's orphaned
                if (!_memoryCache.TryGetValue(kvp.Key, out _))
                {
                    orphanedKeys.Add(kvp.Key);
                }
            }

            foreach (var key in orphanedKeys)
            {
                if (_keyLocks.TryRemove(key, out var semaphore))
                {
                    semaphore?.Dispose();
                    _logger.LogDebug("Cleaned up orphaned lock: {CacheKey}", key);
                }
            }

            if (orphanedKeys.Count > 0)
            {
                _logger.LogInformation("Cleaned up {Count} orphaned locks", orphanedKeys.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during orphaned lock cleanup");
        }
    }

    public void Dispose()
    {
        if (_disposed) return;

        _disposed = true;

        _cleanupTimer?.Dispose();

        // Dispose all remaining semaphores
        foreach (var kvp in _keyLocks)
        {
            kvp.Value?.Dispose();
        }

        _keyLocks.Clear();

        GC.SuppressFinalize(this);
    }
}