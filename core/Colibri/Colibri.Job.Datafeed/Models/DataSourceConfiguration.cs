using Colibri.Job.Datafeed.Models;

namespace Colibri.Job.Datafeed.Models;

public class DataSourceConfiguration
{
    public CsvConfiguration CsvConfiguration { get; set; } = new();
    public ApiEndpointsConfiguration ApiEndpoints { get; set; } = new();
    public LockConfiguration LockConfiguration { get; set; } = new();
}