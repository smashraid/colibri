using System;

namespace Colibri.Job.Datafeed.Models;

public class ApiEndpoint
{
    public string SourceType { get; set; } = string.Empty; // "CSV", "API", "Database"
    public string Name { get; set; } = string.Empty;

    // For CSV sources
    public string? FilePath { get; set; } // Blob URL
    public bool HasHeader { get; set; }
    public List<string>? CompositeKey { get; set; }
    public Dictionary<string, string>? CompositeKeyMapping { get; set; }
    public List<ColumnDefinition>? Columns { get; set; }

    // For Database sources
    public string? ConnectionString { get; set; }
    public string? Query { get; set; }
    public List<string>? Parameters { get; set; }

    // For API sources
    public string? Method { get; set; }
    public string? Url { get; set; }
    public string? AuthenticationType { get; set; }
    public string? AuthenticationHeader { get; set; }
    public string? AuthenticationToken { get; set; }
    public int TimeoutSeconds { get; set; } = 30;
    public int RetryCount { get; set; } = 3;
    public int ExpectedStatusCode { get; set; } = 200;
    public Dictionary<string, object>? RequestBodyTemplate { get; set; }

    // Common properties
    public List<string> CacheKeyParameters { get; set; } = [];
    public int CacheDurationMinutes { get; set; } = 60;
    public bool UseNestedObject { get; set; } = true;
}
