using System;

namespace Colibri.Job.Datafeed.Models;

public class ApiEndpointsConfiguration
{
    public List<ApiEndpoint> Datasources { get; set; } = new();
}
