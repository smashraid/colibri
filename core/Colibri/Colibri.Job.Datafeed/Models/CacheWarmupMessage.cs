using System;

namespace Colibri.Job.Datafeed.Models;

public class CacheWarmupMessage
{
    /// <summary>
    /// Message type for filtering: "CacheWarmup"
    /// </summary>
    public string MessageType { get; set; } = "CacheWarmup";

    /// <summary>
    /// List of datasources to warm up
    /// </summary>
    public List<DataSourceConfiguration> DataSources { get; set; } = [];
}