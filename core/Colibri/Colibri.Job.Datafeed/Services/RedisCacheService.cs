using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Colibri.Job.Datafeed.Services;

public class RedisCacheService : ICacheService, IDisposable
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _database;
    private readonly ILogger<RedisCacheService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;
    private bool _disposed;

    public RedisCacheService(
        IConnectionMultiplexer redis,
        ILogger<RedisCacheService> logger)
    {
        _redis = redis;
        _database = redis.GetDatabase();
        _logger = logger;

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };
    }

    public async Task<T?> GetOrCreateAsync<T>(string cacheKey, Func<Task<T>> factory, TimeSpan expiration)
    {
        // Try to get from Redis first
        try
        {
            var cachedValue = await _database.StringGetAsync(cacheKey);

            if (!cachedValue.IsNullOrEmpty)
            {
                _logger.LogDebug("Redis cache hit: {CacheKey}", cacheKey);
                return Deserialize<T>(cachedValue!);
            }

            _logger.LogDebug("Redis cache miss: {CacheKey}", cacheKey);

            // Cache miss - execute factory
            var value = await factory();

            if (value != null)
            {
                await SetAsync(cacheKey, value, expiration);
            }

            return value;
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Redis error in GetOrCreateAsync for key: {CacheKey}", cacheKey);

            // Fallback to factory on Redis error
            return await factory();
        }
    }

    public async Task SetAsync<T>(string cacheKey, T value, TimeSpan expiration)
    {
        try
        {
            var serializedValue = Serialize(value);

            await _database.StringSetAsync(
                cacheKey,
                serializedValue,
                expiration,
                flags: CommandFlags.FireAndForget);

            _logger.LogTrace("Set Redis cache: {CacheKey}, Expiration: {Expiration}",
                cacheKey, expiration);
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Redis error in SetAsync for key: {CacheKey}", cacheKey);
            // Don't throw - caching failures shouldn't break the application
        }
    }

    public async Task<T?> GetAsync<T>(string cacheKey)
    {
        try
        {
            var cachedValue = await _database.StringGetAsync(cacheKey);

            if (cachedValue.IsNullOrEmpty)
            {
                return default;
            }

            return Deserialize<T>(cachedValue!);
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Redis error in GetAsync for key: {CacheKey}", cacheKey);
            return default;
        }
    }

    public async Task<bool> ExistsAsync(string cacheKey)
    {
        try
        {
            return await _database.KeyExistsAsync(cacheKey);
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Redis error in ExistsAsync for key: {CacheKey}", cacheKey);
            return false;
        }
    }

    public async Task RemoveAsync(string cacheKey)
    {
        try
        {
            await _database.KeyDeleteAsync(cacheKey, flags: CommandFlags.FireAndForget);
            _logger.LogTrace("Removed Redis cache: {CacheKey}", cacheKey);
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Redis error in RemoveAsync for key: {CacheKey}", cacheKey);
        }
    }

    private string Serialize<T>(T value)
    {
        if (value == null)
        {
            return string.Empty;
        }

        // Handle simple types directly
        if (value is string str)
        {
            return str;
        }

        if (value.GetType().IsPrimitive || value is decimal || value is DateTime)
        {
            return value.ToString() ?? string.Empty;
        }

        // Serialize complex types as JSON
        return JsonSerializer.Serialize(value, _jsonOptions);
    }

    private T? Deserialize<T>(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return default;
        }

        var targetType = typeof(T);

        // Handle simple types
        if (targetType == typeof(string))
        {
            return (T)(object)value;
        }

        if (targetType == typeof(int))
        {
            return (T)(object)int.Parse(value);
        }

        if (targetType == typeof(long))
        {
            return (T)(object)long.Parse(value);
        }

        if (targetType == typeof(decimal))
        {
            return (T)(object)decimal.Parse(value);
        }

        if (targetType == typeof(bool))
        {
            return (T)(object)bool.Parse(value);
        }

        if (targetType == typeof(DateTime))
        {
            return (T)(object)DateTime.Parse(value);
        }

        // Deserialize complex types from JSON
        try
        {
            return JsonSerializer.Deserialize<T>(value, _jsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize value for type {Type}", targetType.Name);
            return default;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;

        _disposed = true;

        // ConnectionMultiplexer is typically registered as singleton
        // and should be disposed by DI container, not here

        GC.SuppressFinalize(this);
    }
}