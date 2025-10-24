using System;

namespace Colibri.Job.Datafeed.Options;

public class AzureServiceBusOptions
{
    public const string Path = "Azure:ServiceBus";

    public string Name { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;

    /// <summary>
    /// Subscription for CSV processing messages
    /// </summary>
    public string Subscription { get; set; } = "csv-processing";

    /// <summary>
    /// Subscription for cache warmup messages
    /// </summary>
    public string WarmupSubscription { get; set; } = "cache-warmup";

    public Dictionary<string, object> Options { get; set; } = new();
}
