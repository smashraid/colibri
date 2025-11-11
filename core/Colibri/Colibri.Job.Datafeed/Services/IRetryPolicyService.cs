using Polly;

namespace Colibri.Job.Datafeed.Services;

public interface IRetryPolicyService
{
    /// <summary>
    /// Gets a retry pipeline for blob download operations with exponential backoff
    /// </summary>
    ResiliencePipeline GetBlobDownloadRetryPipeline();

    /// <summary>
    /// Gets a retry pipeline for cache operations with exponential backoff
    /// </summary>
    ResiliencePipeline GetCacheRetryPipeline();
}