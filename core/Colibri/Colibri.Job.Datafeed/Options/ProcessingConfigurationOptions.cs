using System;

namespace Colibri.Job.Datafeed.Options;

public class ProcessingConfigurationOptions
{
    public const string Path = "ProcessingConfiguration";
    public int MaxConcurrentBatches { get; set; }
    public int BatchSize { get; set; }
    public int DelayBetweenBatchesMs { get; set; }
    public int CircuitBreakerFailureThreshold { get; set; }
    public int CircuitBreakerDurationSeconds { get; set; }
}
