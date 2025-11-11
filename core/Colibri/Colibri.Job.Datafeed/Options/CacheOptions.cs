using System;

namespace Colibri.Job.Datafeed.Options;

public class CacheOptions
{
    public const string Path = "Cache";

    /// <summary>
    /// Cache provider type: "Memory" or "Redis"
    /// </summary>
    public string Provider { get; set; } = "Memory";

    /// <summary>
    /// Redis connection string (only used when Provider = "Redis")
    /// Example: "localhost:6379,password=mypassword,ssl=true,abortConnect=false"
    /// </summary>
    public string? RedisConnectionString { get; set; }

    /// <summary>
    /// Redis instance name prefix for cache keys
    /// </summary>
    public string RedisInstanceName { get; set; } = "ColibriDatafeed:";

    /// <summary>
    /// Enable connection retry for Redis
    /// </summary>
    public bool RedisEnableRetry { get; set; } = true;

    /// <summary>
    /// Connect timeout in milliseconds
    /// </summary>
    public int RedisConnectTimeout { get; set; } = 5000;

    /// <summary>
    /// Sync timeout in milliseconds
    /// </summary>
    public int RedisSyncTimeout { get; set; } = 5000;

    /// <summary>
    /// Abort connection if connect fails (false = retry)
    /// </summary>
    public bool RedisAbortOnConnectFail { get; set; } = false;

    /// <summary>
    /// Default cache expiration in minutes (if not specified)
    /// </summary>
    public int DefaultExpirationMinutes { get; set; } = 60;
}