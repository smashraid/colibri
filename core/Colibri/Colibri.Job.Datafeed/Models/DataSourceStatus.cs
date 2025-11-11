using System;

namespace Colibri.Job.Datafeed.Models;

public class DataSourceStatus
{
    public string SourceType { get; set; } = string.Empty;
    public string SourceName { get; set; } = string.Empty;
    public bool NeedRefresh { get; set; }
    public DateTime LastRefreshed { get; set; }
}
