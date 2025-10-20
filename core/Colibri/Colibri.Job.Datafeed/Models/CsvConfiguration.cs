using System;

namespace Colibri.Job.Datafeed.Models;

public class CsvConfiguration
{
    public string FilePath { get; set; } = string.Empty; // Blob URL
    public bool HasHeader { get; set; }
    public List<ColumnDefinition> Columns { get; set; } = new();
}
