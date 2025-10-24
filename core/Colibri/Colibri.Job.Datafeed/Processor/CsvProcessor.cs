using System.Text;
using System.Text.Json;
using Colibri.ExternalServices;
using Colibri.ExternalServices.Contracts;
using Colibri.ExternalServices.Options;
using Colibri.Job.Datafeed.Models;
using Colibri.Job.Datafeed.Options;
using Colibri.Job.Datafeed.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Colibri.Job.Datafeed.Processor;

public class CsvProcessor : ICsvProcessor
{
    private readonly ProcessingConfigurationOptions _processingConfigurationOptions;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IIterableService _iterableService;
    private readonly IterableOptions _iterableOptions;
    private readonly IDataSourceCacheService _dataSourceCacheService;
    private readonly IBlobService _blobService;
    private readonly IDatabaseService _databaseService;
    private readonly ILogger<CsvProcessor> _logger;

    // Statistics
    private long _cacheHits = 0;
    private long _cacheMisses = 0;

    public CsvProcessor(
        IOptions<ProcessingConfigurationOptions> processingConfigurationOptions,
        IHttpClientFactory httpClientFactory,
        IIterableService iterableService,
        IDataSourceCacheService dataSourceCacheService,
        IBlobService blobService,
        IDatabaseService databaseService,
        ILogger<CsvProcessor> logger,
        IOptions<IterableOptions> iterableOptions)
    {
        _processingConfigurationOptions = processingConfigurationOptions.Value;
        _httpClientFactory = httpClientFactory;
        _iterableService = iterableService;
        _dataSourceCacheService = dataSourceCacheService;
        _blobService = blobService;
        _databaseService = databaseService;
        _logger = logger;
        _iterableOptions = iterableOptions.Value;
    }

    public async Task ProcessCsvFileAsync(
        CsvConfiguration csvConfiguration,
        List<string> requiredDatasources,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting CSV file processing");
        ResetStatistics();

        try
        {
            var records = await ReadMainCsvFileAsync(csvConfiguration, cancellationToken);
            _logger.LogInformation("Loaded {RecordCount} records from main CSV", records.Count);

            if (!records.Any())
            {
                _logger.LogWarning("No records found in CSV file");
                return;
            }

            await ProcessRecordsInBatchesAsync(records, requiredDatasources, cancellationToken);
            LogStatistics();
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("CSV processing cancelled");
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing CSV file");
            throw;
        }
    }

    public async Task<List<Dictionary<string, object>>> ReadCsvDataSourceAsync(
        ApiEndpoint endpoint,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(endpoint.FilePath))
        {
            throw new ArgumentException("FilePath is required for CSV data source");
        }

        _logger.LogInformation("Reading CSV data source from blob: {FilePath}", endpoint.FilePath);

        try
        {
            using var stream = await _blobService.DownloadBlobAsync(endpoint.FilePath, cancellationToken);
            using var reader = new StreamReader(stream);

            var records = new List<Dictionary<string, object>>();
            var columnNames = endpoint.Columns?.Select(c => c.Name).ToArray()
                ?? [];

            if (endpoint.HasHeader)
            {
                await reader.ReadLineAsync();
            }

            string? line;
            int lineNumber = 0;

            while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
            {
                lineNumber++;
                cancellationToken.ThrowIfCancellationRequested();

                if (string.IsNullOrWhiteSpace(line)) continue;

                var record = ParseCsvLine(line, columnNames, endpoint.Columns);

                if (record != null && record.Count > 0)
                {
                    records.Add(record);
                }
                else
                {
                    _logger.LogWarning("Skipped invalid line {LineNumber} in CSV: {FileName}",
                        lineNumber, endpoint.Name);
                }
            }

            _logger.LogInformation("Successfully read {Count} records from CSV data source: {Name}",
                records.Count, endpoint.Name);

            return records;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading CSV data source: {Name}", endpoint.Name);
            throw;
        }
    }

    public async Task<List<Dictionary<string, object>>> ReadDatabaseDataSourceAsync(
        ApiEndpoint endpoint,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(endpoint.ConnectionString))
        {
            throw new ArgumentException("ConnectionString is required for database datasource");
        }

        if (string.IsNullOrWhiteSpace(endpoint.Query))
        {
            throw new ArgumentException("Query is required for database datasource");
        }

        _logger.LogInformation("Reading Database data source: {Name} from {DatabaseType}",
            endpoint.Name, endpoint.DatabaseType ?? "Unknown");

        try
        {
            // Execute query without parameters (we'll load ALL data for caching)
            var data = await _databaseService.ExecuteQueryAsync(endpoint, null, cancellationToken);

            _logger.LogInformation("Successfully read {Count} records from database datasource: {Name}",
                data.Count, endpoint.Name);

            return data;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading database datasource: {Name}", endpoint.Name);
            throw;
        }
    }

    private async Task<List<Dictionary<string, object>>> ReadMainCsvFileAsync(
        CsvConfiguration csvConfiguration,
        CancellationToken cancellationToken)
    {
        var records = new List<Dictionary<string, object>>();
        var columnNames = csvConfiguration.Columns.Select(c => c.Name).ToArray();

        _logger.LogInformation("Reading main CSV from blob: {FilePath}", csvConfiguration.FilePath);

        using var stream = await _blobService.DownloadBlobAsync(csvConfiguration.FilePath, cancellationToken);
        using var reader = new StreamReader(stream);

        if (csvConfiguration.HasHeader)
        {
            await reader.ReadLineAsync(cancellationToken);
        }

        string? line;
        int lineNumber = 0;

        while ((line = await reader.ReadLineAsync(cancellationToken)) != null)
        {
            lineNumber++;
            cancellationToken.ThrowIfCancellationRequested();

            if (string.IsNullOrWhiteSpace(line)) continue;

            var record = ParseCsvLine(line, columnNames, csvConfiguration.Columns);

            if (record != null && record.Count > 0)
            {
                records.Add(record);
            }
            else
            {
                _logger.LogWarning("Skipped invalid line {LineNumber}", lineNumber);
            }
        }

        return records;
    }

    private Dictionary<string, object>? ParseCsvLine(
        string line,
        string[] columnNames,
        List<ColumnDefinition>? columnDefinitions)
    {
        var record = new Dictionary<string, object>();
        var values = ParseCsvValues(line);

        if (columnDefinitions == null || !columnDefinitions.Any())
        {
            return null;
        }

        for (int i = 0; i < Math.Min(columnDefinitions.Count, values.Length); i++)
        {
            var column = columnDefinitions[i];
            var value = values[i].Trim();

            if (column.Required && string.IsNullOrEmpty(value))
            {
                _logger.LogWarning("Required column '{ColumnName}' is empty", column.Name);
                return null;
            }

            record[column.Name] = column.Type.ToLower() switch
            {
                "int" or "integer" => int.TryParse(value, out var intVal) ? intVal : 0,
                "decimal" or "double" or "float" => decimal.TryParse(value, out var decVal) ? decVal : 0m,
                "bool" or "boolean" => bool.TryParse(value, out var boolVal) && boolVal,
                "date" or "datetime" => DateTime.TryParse(value, out var dateVal) ? dateVal : DateTime.MinValue,
                _ => value
            };
        }

        return record;
    }

    private string[] ParseCsvValues(string line)
    {
        var values = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == ',' && !inQuotes)
            {
                values.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        values.Add(current.ToString());
        return [.. values];
    }

    private async Task ProcessRecordsInBatchesAsync(
        List<Dictionary<string, object>> records,
        List<string> requiredDatasources,
        CancellationToken cancellationToken)
    {
        var semaphore = new SemaphoreSlim(_processingConfigurationOptions.MaxConcurrentBatches);
        var tasks = new List<Task>();
        var processedCount = 0;
        var totalRecords = records.Count;

        for (int i = 0; i < totalRecords; i += _processingConfigurationOptions.BatchSize)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var batch = records.Skip(i).Take(_processingConfigurationOptions.BatchSize).ToList();
            var batchNumber = (i / _processingConfigurationOptions.BatchSize) + 1;

            await semaphore.WaitAsync(cancellationToken);

            tasks.Add(Task.Run(async () =>
            {
                try
                {
                    await ProcessBatchAsync(batch, batchNumber, requiredDatasources, cancellationToken);
                    var newCount = Interlocked.Add(ref processedCount, batch.Count);
                    _logger.LogInformation("Progress: {Processed}/{Total} records ({Percentage:F1}%)",
                        newCount, totalRecords, (newCount * 100.0) / totalRecords);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing batch {BatchNumber}", batchNumber);
                    throw;
                }
                finally
                {
                    semaphore.Release();
                }
            }, cancellationToken));

            if (_processingConfigurationOptions.DelayBetweenBatchesMs > 0)
            {
                await Task.Delay(_processingConfigurationOptions.DelayBetweenBatchesMs, cancellationToken);
            }
        }

        await Task.WhenAll(tasks);
        _logger.LogInformation("Completed processing all {Count} records", totalRecords);
    }

    private async Task ProcessBatchAsync(
        List<Dictionary<string, object>> batch,
        int batchNumber,
        List<string> requiredDatasources,
        CancellationToken cancellationToken)
    {
        var tasks = batch.Select(record => ProcessSingleRecordAsync(record, requiredDatasources, cancellationToken));
        var results = await Task.WhenAll(tasks);
        var successCount = results.Count(r => r);

        _logger.LogDebug("Batch {BatchNumber}: {SuccessCount}/{TotalCount} successful",
            batchNumber, successCount, batch.Count);
    }

    private async Task<bool> ProcessSingleRecordAsync(
        Dictionary<string, object> record,
        List<string> requiredDatasources,
        CancellationToken cancellationToken)
    {
        try
        {
            // Start with original CSV fields (NO PREFIX)
            var dataFields = new Dictionary<string, object>(record);

            // Process each required datasource
            foreach (var datasourceName in requiredDatasources)
            {
                cancellationToken.ThrowIfCancellationRequested();

                // Build composite key from record for this datasource
                // Note: You may need to pass composite key field info here
                // For now, we'll get data by datasource name only
                var result = await GetDataFromDatasourceAsync(datasourceName, record, cancellationToken);

                if (result != null && result.Count > 0)
                {
                    // Add prefixed fields (flat structure)
                    foreach (var kvp in result)
                    {
                        var prefixedKey = $"{datasourceName}_{kvp.Key}";
                        dataFields[prefixedKey] = kvp.Value;
                    }

                    _logger.LogDebug("Added {Count} fields from datasource {DatasourceName}",
                        result.Count, datasourceName);
                }
                else
                {
                    _logger.LogWarning("Datasource {DatasourceName} returned no data for record",
                        datasourceName);
                }
            }

            // Add metadata
            dataFields["last_updated"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
            dataFields["processing_date"] = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");

            // Update Iterable with all enriched data
            return await UpdateIterableUserAsync(record, dataFields, cancellationToken);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process record");
            return false;
        }
    }

    private async Task<Dictionary<string, object>?> GetDataFromDatasourceAsync(
        string datasourceName,
        Dictionary<string, object> record,
        CancellationToken cancellationToken)
    {
        // Build composite key from record
        // This is simplified - you may need to know which fields to use for the key
        // For now, let's assume the datasource name and basic fields
        var compositeKey = new Dictionary<string, object>();

        // Try common key fields
        if (record.TryGetValue("year", out var year))
            compositeKey["year"] = year;
        if (record.TryGetValue("zipCode", out var zipCode))
            compositeKey["zip"] = zipCode; // Note: using mapped name
        if (record.TryGetValue("agentEmailAddress", out var agentEmail))
            compositeKey["AgentId"] = agentEmail;

        // Get from cache (already warmed up!)
        var cachedData = await _dataSourceCacheService.GetCachedDataAsync(
            datasourceName,
            compositeKey,
            cancellationToken);

        if (cachedData != null)
        {
            Interlocked.Increment(ref _cacheHits);
            _logger.LogDebug("Cache hit for {DatasourceName}", datasourceName);
        }
        else
        {
            Interlocked.Increment(ref _cacheMisses);
            _logger.LogWarning("Cache miss for {DatasourceName}", datasourceName);
        }

        return cachedData;
    }

    private async Task<bool> UpdateIterableUserAsync(
        Dictionary<string, object> record,
        Dictionary<string, object> dataFields,
        CancellationToken cancellationToken)
    {
        var email = record.GetValueOrDefault("email")?.ToString();

        if (string.IsNullOrWhiteSpace(email))
        {
            _logger.LogWarning("Email not found in record");
            return false;
        }

        var request = new UserUpdateRequest
        {
            Email = email,
            DataFields = dataFields
        };

        var userUpdateResponse = await _iterableService.UpdateUserAsync(
            request,
            _iterableOptions.Token,
            cancellationToken);

        return userUpdateResponse != null && userUpdateResponse.Code == "Success";
    }

    private void ResetStatistics()
    {
        _cacheHits = 0;
        _cacheMisses = 0;
    }

    private void LogStatistics()
    {
        var totalCalls = _cacheHits + _cacheMisses;
        var cacheHitRate = totalCalls > 0 ? (_cacheHits * 100.0) / totalCalls : 0;

        _logger.LogInformation(
            "Processing Statistics - Cache Hits: {CacheHits}, Cache Misses: {CacheMisses}, Hit Rate: {HitRate:F1}%",
            _cacheHits, _cacheMisses, cacheHitRate);
    }
}