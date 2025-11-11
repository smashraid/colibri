using System;

namespace Colibri.Job.Datafeed.Services;

public interface ICacheKeyGenerator
{
    /// <summary>
    /// Generates a cache key from a template and record data
    /// Template format: "datasource:PlanGeneral:$year$:$zipCode$"
    /// </summary>
    string GenerateKey(string template, Dictionary<string, object> record);
}
