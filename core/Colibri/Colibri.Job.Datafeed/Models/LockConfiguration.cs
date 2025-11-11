using System;

namespace Colibri.Job.Datafeed.Models;

public class LockConfiguration
{
    /// <summary>
    /// Maximum time in seconds to wait for acquiring a lock (0 = don't wait, fail immediately)
    /// Default: 30 seconds
    /// </summary>
    public int WaitTimeSeconds { get; set; } = 30;

    /// <summary>
    /// How long the lock remains valid in seconds
    /// Default: 300 seconds (5 minutes)
    /// </summary>
    public int LockExpirySeconds { get; set; } = 300;

    /// <summary>
    /// Whether to enable distributed locking for cache refresh operations
    /// Default: true
    /// </summary>
    public bool EnableDistributedLock { get; set; } = true;
}
