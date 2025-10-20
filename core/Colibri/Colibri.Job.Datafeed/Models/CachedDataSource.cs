using System;

namespace Colibri.Job.Datafeed.Models;

public class CachedDataSource
{
    public string SourceName { get; set; } = string.Empty;
    public Dictionary<string, Dictionary<string, object>> Data { get; set; } = new();
    public DateTime CachedAt { get; set; }
}
