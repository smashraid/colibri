using Colibri.Job.Datafeed.Models;

namespace Colibri.Job.Datafeed.Processor;

public interface ICsvProcessor
{
    /// <summary>
    /// Processes the main CSV file using pre-warmed cache
    /// </summary>
    Task ProcessCsvFileAsync(
        CsvConfiguration csvConfiguration,
        List<string> requiredDatasources,
        CancellationToken cancellationToken);

    /// <summary>
    /// Reads CSV data source from blob storage for caching
    /// </summary>
    Task<List<Dictionary<string, object>>> ReadCsvDataSourceAsync(
        ApiEndpoint endpoint,
        CancellationToken cancellationToken);

    /// <summary>
    /// Reads database data source for caching
    /// </summary>
    Task<List<Dictionary<string, object>>> ReadDatabaseDataSourceAsync(
        ApiEndpoint endpoint,
        CancellationToken cancellationToken);
}