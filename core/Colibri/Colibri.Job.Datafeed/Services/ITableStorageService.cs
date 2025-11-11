using Colibri.Job.Datafeed.Models;

namespace Colibri.Job.Datafeed.Services;

public interface ITableStorageService
{
    Task<DataSourceStatus?> GetDataSourceStatusAsync(string sourceType, string sourceName, CancellationToken cancellationToken = default);
    Task<bool> ShouldRefreshCacheAsync(string sourceType, string sourceName, CancellationToken cancellationToken = default);
    Task UpdateLastRefreshedAsync(string sourceType, string sourceName, CancellationToken cancellationToken = default);
}