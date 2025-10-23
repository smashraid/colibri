using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;

namespace Colibri.Job.Datafeed.Services;

public class RetryPolicyService : IRetryPolicyService
{
    private readonly ILogger<RetryPolicyService> _logger;

    public RetryPolicyService(ILogger<RetryPolicyService> logger)
    {
        _logger = logger;
    }

    public ResiliencePipeline GetCacheRetryPipeline()
    {
        return new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                ShouldHandle = new PredicateBuilder().Handle<Exception>(ex =>
                    ex is not OperationCanceledException),
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(2),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                OnRetry = args =>
                {
                    _logger.LogWarning(
                        "Cache operation failed (Attempt {Attempt}): {Exception}. Retrying in {Delay}s...",
                        args.AttemptNumber + 1,
                        args.Outcome.Exception?.Message,
                        args.RetryDelay.TotalSeconds);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }

    public ResiliencePipeline GetLockWaitRetryPipeline(int maxRetries, int delaySeconds)
    {
        return new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                ShouldHandle = new PredicateBuilder().Handle<InvalidOperationException>(ex =>
                    ex.Message.Contains("Cache refresh required but lock could not be acquired")),
                MaxRetryAttempts = maxRetries,
                Delay = TimeSpan.FromSeconds(delaySeconds),
                BackoffType = DelayBackoffType.Constant,
                OnRetry = args =>
                {
                    _logger.LogInformation(
                        "Waiting for cache to be populated by another pod (Attempt {Attempt}/{MaxAttempts}). " +
                        "Retrying in {Delay}s...",
                        args.AttemptNumber + 1,
                        maxRetries,
                        args.RetryDelay.TotalSeconds);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }

    public ResiliencePipeline GetBlobDownloadRetryPipeline()
    {
        return new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TimeoutException>()
                    .Handle<IOException>(),
                MaxRetryAttempts = 3,
                Delay = TimeSpan.FromSeconds(5),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                OnRetry = args =>
                {
                    _logger.LogWarning(
                        "Blob download failed (Attempt {Attempt}): {Exception}. Retrying in {Delay}s...",
                        args.AttemptNumber + 1,
                        args.Outcome.Exception?.Message,
                        args.RetryDelay.TotalSeconds);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }

    public ResiliencePipeline GetApiRetryPipeline(int maxRetries)
    {
        return new ResiliencePipelineBuilder()
            .AddRetry(new RetryStrategyOptions
            {
                ShouldHandle = new PredicateBuilder()
                    .Handle<HttpRequestException>()
                    .Handle<TimeoutException>(),
                MaxRetryAttempts = maxRetries,
                Delay = TimeSpan.FromSeconds(1),
                BackoffType = DelayBackoffType.Exponential,
                UseJitter = true,
                OnRetry = args =>
                {
                    _logger.LogWarning(
                        "API call failed (Attempt {Attempt}): {Exception}. Retrying in {Delay}s...",
                        args.AttemptNumber + 1,
                        args.Outcome.Exception?.Message,
                        args.RetryDelay.TotalSeconds);
                    return ValueTask.CompletedTask;
                }
            })
            .Build();
    }
}
