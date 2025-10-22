namespace Colibri.Job.Datafeed.Services;

public interface IDistributedLockService
{
    /// <summary>
    /// Executes an action with a distributed lock
    /// </summary>
    /// <param name="resourceKey">Unique key for the resource to lock</param>
    /// <param name="action">Action to execute while holding the lock</param>
    /// <param name="waitTimeSeconds">Maximum time to wait for the lock (0 = no wait)</param>
    /// <param name="lockExpirySeconds">How long the lock is valid for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if lock was acquired and action executed, false if lock could not be acquired</returns>
    Task<bool> ExecuteWithLockAsync(
        string resourceKey,
        Func<Task> action,
        int waitTimeSeconds = 0,
        int lockExpirySeconds = 30,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes a function with a distributed lock and returns a result
    /// </summary>
    Task<(bool Success, T? Result)> ExecuteWithLockAsync<T>(
        string resourceKey,
        Func<Task<T>> function,
        int waitTimeSeconds = 0,
        int lockExpirySeconds = 30,
        CancellationToken cancellationToken = default);
}
