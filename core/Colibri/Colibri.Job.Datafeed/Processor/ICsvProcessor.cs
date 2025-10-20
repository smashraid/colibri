using System;
using Colibri.Job.Datafeed.Models;

namespace Colibri.Job.Datafeed.Processor;

public interface ICsvProcessor
{
    Task ProcessCsvFileAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken);
    Task<List<Dictionary<string, object>>> ReadCsvDataSourceAsync(ApiEndpoint endpoint, CancellationToken cancellationToken);
    Task<List<Dictionary<string, object>>> ReadDatabaseDataSourceAsync(ApiEndpoint endpoint, CancellationToken cancellationToken);
}
