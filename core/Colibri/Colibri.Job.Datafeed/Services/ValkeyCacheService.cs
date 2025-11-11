using System;
using System.Text.Json;
using System.Threading.Tasks;
using Colibri.Job.Datafeed.Options;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Colibri.Job.Datafeed.Services;

public class ValkeyCacheService : ICacheService, IDisposable
{
    private readonly IConnectionMultiplexer _valkey;
    private readonly IDatabase _database;
    private readonly ILogger<ValkeyCacheService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly string _instanceName;
    private bool _disposed;

    public ValkeyCacheService(
        IConnectionMultiplexer valkey,
        ILogger<ValkeyCacheService> logger,
        Microsoft.Extensions.Options.IOptions<CacheOptions> cacheOptions)
    {
        _valkey = valkey;
        _database = valkey.GetDatabase();
        _logger = logger;
        _instanceName = cacheOptions.Value.RedisInstanceName ?? "ColibriDatafeed:";

        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        _logger.LogInformation("Valkey Cache Service initialized with instance name: {InstanceName}", _instanceName);
    }

    public async Task<T?> GetOrCreateAsync<T>(string cacheKey, Func<Task<T>> factory, TimeSpan expiration)
    {
        var fullKey = GetFullKey(cacheKey);

        try
        {
            var cachedValue = await _database.StringGetAsync(fullKey);

            if (!cachedValue.IsNullOrEmpty)
            {
                _logger.LogDebug("Valkey cache hit: {CacheKey}", cacheKey);
                return Deserialize<T>(cachedValue!);
            }

            _logger.LogDebug("Valkey cache miss: {CacheKey}", cacheKey);

            var value = await factory();

            if (value != null)
            {
                await SetAsync(cacheKey, value, expiration);
            }

            return value;
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Valkey error in GetOrCreateAsync for key: {CacheKey}", cacheKey);
            return await factory();
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning(ex, "Valkey timeout in GetOrCreateAsync for key: {CacheKey}, falling back to factory", cacheKey);
            return await factory();
        }
    }

    public async Task SetAsync<T>(string cacheKey, T value, TimeSpan expiration)
    {
        var fullKey = GetFullKey(cacheKey);

        try
        {
            var serializedValue = Serialize(value);

            var success = await _database.StringSetAsync(
                fullKey,
                serializedValue,
                expiration,
                flags: CommandFlags.FireAndForget);

            _logger.LogTrace("Set Valkey cache: {CacheKey}, Expiration: {Expiration}, Success: {Success}",
                cacheKey, expiration, success);
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Valkey error in SetAsync for key: {CacheKey}", cacheKey);
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning(ex, "Valkey timeout in SetAsync for key: {CacheKey}", cacheKey);
        }
    }

    public async Task<T?> GetAsync<T>(string cacheKey)
    {
        var fullKey = GetFullKey(cacheKey);

        try
        {
            var cachedValue = await _database.StringGetAsync(fullKey);

            if (cachedValue.IsNullOrEmpty)
            {
                return default;
            }

            return Deserialize<T>(cachedValue!);
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Valkey error in GetAsync for key: {CacheKey}", cacheKey);
            return default;
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning(ex, "Valkey timeout in GetAsync for key: {CacheKey}", cacheKey);
            return default;
        }
    }

    public async Task<bool> ExistsAsync(string cacheKey)
    {
        var fullKey = GetFullKey(cacheKey);

        try
        {
            return await _database.KeyExistsAsync(fullKey);
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Valkey error in ExistsAsync for key: {CacheKey}", cacheKey);
            return false;
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning(ex, "Valkey timeout in ExistsAsync for key: {CacheKey}", cacheKey);
            return false;
        }
    }

    public async Task RemoveAsync(string cacheKey)
    {
        var fullKey = GetFullKey(cacheKey);

        try
        {
            await _database.KeyDeleteAsync(fullKey, flags: CommandFlags.FireAndForget);
            _logger.LogTrace("Removed Valkey cache: {CacheKey}", cacheKey);
        }
        catch (RedisException ex)
        {
            _logger.LogError(ex, "Valkey error in RemoveAsync for key: {CacheKey}", cacheKey);
        }
        catch (TimeoutException ex)
        {
            _logger.LogWarning(ex, "Valkey timeout in RemoveAsync for key: {CacheKey}", cacheKey);
        }
    }

    private string GetFullKey(string cacheKey)
    {
        return $"{_instanceName}{cacheKey}";
    }

    private string Serialize<T>(T value)
    {
        if (value == null)
        {
            return string.Empty;
        }

        if (value is string str)
        {
            return str;
        }

        if (value.GetType().IsPrimitive || value is decimal || value is DateTime || value is DateTimeOffset)
        {
            return value.ToString() ?? string.Empty;
        }

        return JsonSerializer.Serialize(value, _jsonOptions);
    }

    private T? Deserialize<T>(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return default;
        }

        var targetType = typeof(T);

        if (targetType == typeof(string))
        {
            return (T)(object)value;
        }

        if (targetType == typeof(int))
        {
            return int.TryParse(value, out var result) ? (T)(object)result : default;
        }

        if (targetType == typeof(long))
        {
            return long.TryParse(value, out var result) ? (T)(object)result : default;
        }

        if (targetType == typeof(decimal))
        {
            return decimal.TryParse(value, out var result) ? (T)(object)result : default;
        }

        if (targetType == typeof(bool))
        {
            return bool.TryParse(value, out var result) ? (T)(object)result : default;
        }

        if (targetType == typeof(DateTime))
        {
            return DateTime.TryParse(value, out var result) ? (T)(object)result : default;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(value, _jsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize Valkey value for type {Type}", targetType.Name);
            return default;
        }
    }

    public void Dispose()
    {
        if (_disposed) return;

        _disposed = true;

        GC.SuppressFinalize(this);
    }
}