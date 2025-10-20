using System;
using Serilog.Events;
using Serilog.Sinks.Splunk;

namespace Colibri.Job.Datafeed.Options;

public class SerilogSplunkOptions
{
    public const string Path = "Splunk";
    public string EventCollectorToken { get; set; } = string.Empty;
    public string SplunkHost { get; set; } = string.Empty;
    public string Host { get; set; } = Environment.MachineName;
    public string Index { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public int BatchSizeLimit { get; set; } = 100;
    public int BatchIntervalInSeconds { get; set; } = 2;
    public LogEventLevel RestrictedToMinimumLevel { get; set; } =
    LogEventLevel.Verbose;

    public CustomFields Fields { get; set; } = new CustomFields
    {
        CustomFieldList =
        [
            new CustomField ("Aplication", "Colibri.Job.Datafeed")
        ]
    };
}
