using System;
using Microsoft.Extensions.Logging;
using RedLockNet.SERedis;
using RedLockNet.SERedis.Configuration;
using StackExchange.Redis;

namespace Colibri.Job.Datafeed.Services;

public class DistributedLockService : IDistributedLockService, IDisposable
{
    private readonly RedLockFactory _redLockFactory;
    private readonly ILogger<DistributedLockService> _logger;
    private bool _disposed;

    public DistributedLockService(
        IConnectionMultiplexer connectionMultiplexer,
        ILogger<DistributedLockService> logger)
    {
        _logger = logger;

        // Create RedLock factory with the existing connection
        var multiplexers = new List<RedLockMultiplexer>
        {
            new RedLockMultiplexer(connectionMultiplexer)
        };

        _redLockFactory = RedLockFactory.Create(multiplexers);

        _logger.LogInformation("DistributedLockService initialized with RedLock");
    }

    public async Task<bool> ExecuteWithLockAsync(
        string resourceKey,
        Func<Task> action,
        int waitTimeSeconds = 0,
        int lockExpirySeconds = 30,
        CancellationToken cancellationToken = default)
    {
        var lockKey = $"lock:{resourceKey}";
        var waitTime = TimeSpan.FromSeconds(waitTimeSeconds);
        var expiryTime = TimeSpan.FromSeconds(lockExpirySeconds);

        _logger.LogInformation(
            "Attempting to acquire distributed lock: {LockKey}, WaitTime: {WaitTime}s, ExpiryTime: {ExpiryTime}s",
            lockKey, waitTimeSeconds, lockExpirySeconds);

        await using var redLock = await _redLockFactory.CreateLockAsync(
            lockKey,
            expiryTime,
            waitTime,
            TimeSpan.FromMilliseconds(100), // Retry time between lock attempts
            cancellationToken);

        if (!redLock.IsAcquired)
        {
            _logger.LogWarning(
                "Failed to acquire distributed lock: {LockKey} after waiting {WaitTime}s",
                lockKey, waitTimeSeconds);
            return false;
        }

        _logger.LogInformation("Acquired distributed lock: {LockKey}", lockKey);

        try
        {
            await action();
            _logger.LogInformation("Successfully executed action with lock: {LockKey}", lockKey);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing action with lock: {LockKey}", lockKey);
            throw;
        }
        finally
        {
            _logger.LogInformation("Released distributed lock: {LockKey}", lockKey);
        }
    }

    public async Task<(bool Success, T? Result)> ExecuteWithLockAsync<T>(
        string resourceKey,
        Func<Task<T>> function,
        int waitTimeSeconds = 0,
        int lockExpirySeconds = 30,
        CancellationToken cancellationToken = default)
    {
        var lockKey = $"lock:{resourceKey}";
        var waitTime = TimeSpan.FromSeconds(waitTimeSeconds);
        var expiryTime = TimeSpan.FromSeconds(lockExpirySeconds);

        _logger.LogInformation(
            "Attempting to acquire distributed lock: {LockKey}, WaitTime: {WaitTime}s, ExpiryTime: {ExpiryTime}s",
            lockKey, waitTimeSeconds, lockExpirySeconds);

        await using var redLock = await _redLockFactory.CreateLockAsync(
            lockKey,
            expiryTime,
            waitTime,
            TimeSpan.FromMilliseconds(100),
            cancellationToken);

        if (!redLock.IsAcquired)
        {
            _logger.LogWarning(
                "Failed to acquire distributed lock: {LockKey} after waiting {WaitTime}s",
                lockKey, waitTimeSeconds);
            return (false, default);
        }

        _logger.LogInformation("Acquired distributed lock: {LockKey}", lockKey);

        try
        {
            var result = await function();
            _logger.LogInformation("Successfully executed function with lock: {LockKey}", lockKey);
            return (true, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing function with lock: {LockKey}", lockKey);
            throw;
        }
        finally
        {
            _logger.LogInformation("Released distributed lock: {LockKey}", lockKey);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;

        _disposed = true;
        _redLockFactory?.Dispose();

        GC.SuppressFinalize(this);
    }
}
