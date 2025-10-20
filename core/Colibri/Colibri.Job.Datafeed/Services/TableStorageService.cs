using System;
using Azure;
using Azure.Data.Tables;
using Colibri.Job.Datafeed.Models;
using Colibri.Job.Datafeed.Options;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Colibri.Job.Datafeed.Services;

public class TableStorageService : ITableStorageService
{
    private readonly TableClient _tableClient;
    private readonly ILogger<TableStorageService> _logger;

    public TableStorageService(
        TableServiceClient tableServiceClient,
        IOptions<AzureServiceStorageOptions> storageOptions,
        ILogger<TableStorageService> logger)
    {
        _logger = logger;
        var tableName = storageOptions.Value.TableName;
        _tableClient = tableServiceClient.GetTableClient(tableName);

        // Ensure table exists
        _tableClient.CreateIfNotExists();
    }

    public async Task<DataSourceStatus?> GetDataSourceStatusAsync(
        string sourceType,
        string sourceName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _tableClient.GetEntityAsync<DataSourceStatusEntity>(
                sourceType,
                sourceName,
                cancellationToken: cancellationToken);

            return new DataSourceStatus
            {
                SourceType = response.Value.PartitionKey,
                SourceName = response.Value.RowKey,
                NeedRefresh = response.Value.NeedRefresh,
                LastRefreshed = response.Value.LastRefreshed
            };
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            _logger.LogWarning("Data source status not found: {SourceType}/{SourceName}", sourceType, sourceName);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving data source status: {SourceType}/{SourceName}", sourceType, sourceName);
            throw;
        }
    }

    public async Task<bool> ShouldRefreshCacheAsync(
        string sourceType,
        string sourceName,
        CancellationToken cancellationToken = default)
    {
        var status = await GetDataSourceStatusAsync(sourceType, sourceName, cancellationToken);

        // If no status found, assume refresh is needed
        if (status == null)
        {
            _logger.LogInformation("No status found for {SourceType}/{SourceName}, refresh needed", sourceType, sourceName);
            return true;
        }

        _logger.LogDebug("Data source {SourceType}/{SourceName} - NeedRefresh: {NeedRefresh}",
            sourceType, sourceName, status.NeedRefresh);

        return status.NeedRefresh;
    }

    public async Task UpdateLastRefreshedAsync(
        string sourceType,
        string sourceName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var entity = new DataSourceStatusEntity
            {
                PartitionKey = sourceType,
                RowKey = sourceName,
                NeedRefresh = false,
                LastRefreshed = DateTime.UtcNow
            };

            await _tableClient.UpsertEntityAsync(entity, TableUpdateMode.Merge, cancellationToken);

            _logger.LogInformation("Updated last refreshed for {SourceType}/{SourceName}", sourceType, sourceName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating last refreshed: {SourceType}/{SourceName}", sourceType, sourceName);
            throw;
        }
    }
}

public class DataSourceStatusEntity : ITableEntity
{
    public string PartitionKey { get; set; } = string.Empty; // SourceType
    public string RowKey { get; set; } = string.Empty; // SourceName
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }
    public bool NeedRefresh { get; set; }
    public DateTime LastRefreshed { get; set; }
}