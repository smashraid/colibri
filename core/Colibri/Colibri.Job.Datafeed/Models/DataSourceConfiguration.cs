namespace Colibri.Job.Datafeed.Models;

public class DataSourceConfiguration
{
    public string Name { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty; // CSV, Database, API

    // CSV specific
    public string? FilePath { get; set; }
    public bool HasHeader { get; set; }
    public List<ColumnDefinition>? Columns { get; set; }

    // Database specific
    public string? ConnectionString { get; set; }
    public string? DatabaseType { get; set; }
    public string? Query { get; set; }
    public string? CommandType { get; set; }

    // API specific (usually not cached in warmup)
    public string? Url { get; set; }
    public string? Method { get; set; }

    // Common
    public List<string>? CompositeKey { get; set; }
    public Dictionary<string, string>? CompositeKeyMapping { get; set; }
    public List<string>? Parameters { get; set; }

    /// <summary>
    /// Cache duration in minutes
    /// 1 month = 43200, 3 months = 129600, 5 months = 216000
    /// </summary>
    public int CacheDurationMinutes { get; set; } = 129600; // 3 months default

    public int TimeoutSeconds { get; set; } = 300;

    /// <summary>
    /// When this datasource should be refreshed next
    /// Used for tracking refresh schedules
    /// </summary>
    public DateTime? NextRefreshDate { get; set; }

    /// <summary>
    /// How often to refresh (in days)
    /// </summary>
    public int RefreshIntervalDays { get; set; } = 90; // 3 months default
}