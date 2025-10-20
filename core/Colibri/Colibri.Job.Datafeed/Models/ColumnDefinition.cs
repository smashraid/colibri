using System;

namespace Colibri.Job.Datafeed.Models;

public class ColumnDefinition
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "string";
    public bool Required { get; set; }
}
