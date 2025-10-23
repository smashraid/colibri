using Polly;

namespace Colibri.Job.Datafeed.Services;

public interface IRetryPolicyService
{
    /// <summary>
    /// Gets a retry pipeline for cache operations with exponential backoff
    /// </summary>
    ResiliencePipeline GetCacheRetryPipeline();

    /// <summary>
    /// Gets a retry pipeline for waiting on distributed locks
    /// </summary>
    ResiliencePipeline GetLockWaitRetryPipeline(int maxRetries, int delaySeconds);

    /// <summary>
    /// Gets a retry pipeline for blob download operations
    /// </summary>
    ResiliencePipeline GetBlobDownloadRetryPipeline();

    /// <summary>
    /// Gets a retry pipeline for API calls
    /// </summary>
    ResiliencePipeline GetApiRetryPipeline(int maxRetries);
}
