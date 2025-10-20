using System;

namespace Colibri.Job.Datafeed.Options;

public class AzureServiceBusOptions
{
    public const string Path = "Azure:ServiceBus";
    public string Name { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string Subscription { get; set; } = string.Empty;
}
