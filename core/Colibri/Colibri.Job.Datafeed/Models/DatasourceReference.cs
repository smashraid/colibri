using System;

namespace Colibri.Job.Datafeed.Models;

public class DatasourceReference
{
    /// <summary>
    /// Name of the datasource (e.g., "PlanGeoGeneral")
    /// </summary>
    public string DataSourceName { get; set; } = string.Empty;

    /// <summary>
    /// Key template with placeholders (e.g., "datasource:PlanGeneral:$year$:$zipCode$")
    /// Placeholders use $fieldName$ syntax
    /// </summary>
    public string KeyTemplate { get; set; } = string.Empty;

    /// <summary>
    /// Whether to use nested object or flat prefix structure
    /// Default: false (flat with prefix)
    /// </summary>
    public bool UseNestedObject { get; set; } = false;
}
