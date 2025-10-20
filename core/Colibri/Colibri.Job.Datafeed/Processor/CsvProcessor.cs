using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Azure.Core;
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
    private readonly ICacheService _cacheService;
    private readonly IDataSourceCacheService _dataSourceCacheService;
    private readonly IBlobService _blobService;
    private readonly ILogger<CsvProcessor> _logger;

    // Statistics
    private long _totalApiCalls = 0;
    private long _cacheHits = 0;
    private long _cacheMisses = 0;
    private long _apiFailures = 0;

    public CsvProcessor(
        IOptions<ProcessingConfigurationOptions> processingConfigurationOptions,
        IHttpClientFactory httpClientFactory,
        IIterableService iterableService,
        ICacheService cacheService,
        IDataSourceCacheService dataSourceCacheService,
        IBlobService blobService,
        ILogger<CsvProcessor> logger,
        IOptions<IterableOptions> iterableOptions)
    {
        _processingConfigurationOptions = processingConfigurationOptions.Value;
        _httpClientFactory = httpClientFactory;
        _iterableService = iterableService;
        _cacheService = cacheService;
        _dataSourceCacheService = dataSourceCacheService;
        _blobService = blobService;
        _logger = logger;
        _iterableOptions = iterableOptions.Value;
    }

    public async Task ProcessCsvFileAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting CSV file processing");
        ResetStatistics();

        try
        {
            var records = await ReadMainCsvFileAsync(configuration, cancellationToken);
            _logger.LogInformation("Loaded {RecordCount} records from main CSV", records.Count);

            if (!records.Any())
            {
                _logger.LogWarning("No records found in CSV file");
                return;
            }

            await ProcessRecordsInBatchesAsync(records, configuration, cancellationToken);
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
                ?? Array.Empty<string>();

            if (endpoint.HasHeader)
            {
                await reader.ReadLineAsync();
            }

            string? line;
            int lineNumber = 0;

            while ((line = await reader.ReadLineAsync()) != null)
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
        _logger.LogWarning("Database data source reading not yet implemented: {Name}", endpoint.Name);
        await Task.CompletedTask;
        return new List<Dictionary<string, object>>();
    }

    private async Task<List<Dictionary<string, object>>> ReadMainCsvFileAsync(
        DataSourceConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var records = new List<Dictionary<string, object>>();
        var csvConfig = configuration.CsvConfiguration;
        var columnNames = csvConfig.Columns.Select(c => c.Name).ToArray();

        _logger.LogInformation("Reading main CSV from blob: {FilePath}", csvConfig.FilePath);

        using var stream = await _blobService.DownloadBlobAsync(csvConfig.FilePath, cancellationToken);
        using var reader = new StreamReader(stream);

        if (csvConfig.HasHeader)
        {
            await reader.ReadLineAsync();
        }

        string? line;
        int lineNumber = 0;

        while ((line = await reader.ReadLineAsync()) != null)
        {
            lineNumber++;
            cancellationToken.ThrowIfCancellationRequested();

            if (string.IsNullOrWhiteSpace(line)) continue;

            var record = ParseCsvLine(line, columnNames, csvConfig.Columns);

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
        return values.ToArray();
    }

    private async Task ProcessRecordsInBatchesAsync(
        List<Dictionary<string, object>> records,
        DataSourceConfiguration configuration,
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
                    await ProcessBatchAsync(batch, batchNumber, configuration, cancellationToken);
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
        DataSourceConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var tasks = batch.Select(record => ProcessSingleRecordAsync(record, configuration, cancellationToken));
        var results = await Task.WhenAll(tasks);
        var successCount = results.Count(r => r);

        _logger.LogDebug("Batch {BatchNumber}: {SuccessCount}/{TotalCount} successful",
            batchNumber, successCount, batch.Count);
    }

    private async Task<bool> ProcessSingleRecordAsync(
        Dictionary<string, object> record,
        DataSourceConfiguration configuration,
        CancellationToken cancellationToken)
    {
        try
        {
            // Start with original CSV fields (NO PREFIX)
            var dataFields = new Dictionary<string, object>(record);

            // Process each data source endpoint
            if (configuration.ApiEndpoints?.Datasources != null)
            {
                foreach (var endpoint in configuration.ApiEndpoints.Datasources)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var result = await GetDataFromEndpointAsync(endpoint, record, cancellationToken);

                    if (result != null && result.Count > 0)
                    {
                        // Check if we should use nested object or flat prefix
                        if (endpoint.UseNestedObject)
                        {
                            // Add as single nested object
                            dataFields[endpoint.Name] = result;

                            _logger.LogDebug("Added nested object '{EndpointName}' with {Count} fields for email: {Email}",
                                endpoint.Name, result.Count, record.GetValueOrDefault("email"));
                        }
                        else
                        {
                            // Add prefixed fields (flat structure)
                            foreach (var kvp in result)
                            {
                                var prefixedKey = $"{endpoint.Name}_{kvp.Key}";
                                dataFields[prefixedKey] = kvp.Value;
                            }

                            _logger.LogDebug("Added {Count} prefixed fields from endpoint {EndpointName} for email: {Email}",
                                result.Count, endpoint.Name, record.GetValueOrDefault("email"));
                        }
                    }
                    else
                    {
                        _logger.LogWarning("Endpoint {EndpointName} returned no data for record with email: {Email}",
                            endpoint.Name, record.GetValueOrDefault("email"));
                    }
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
            _logger.LogError(ex, "Failed to process record with email: {Email}",
                record.GetValueOrDefault("email"));
            return false;
        }
    }

    private async Task<Dictionary<string, object>?> GetDataFromEndpointAsync(
        ApiEndpoint endpoint,
        Dictionary<string, object> record,
        CancellationToken cancellationToken)
    {
        return endpoint.SourceType.ToUpper() switch
        {
            "CSV" => await GetCsvDataAsync(endpoint, record, cancellationToken),
            "DATABASE" => await GetDatabaseDataAsync(endpoint, record, cancellationToken),
            "API" => await GetApiDataAsync(endpoint, record, cancellationToken),
            _ => throw new NotSupportedException($"Unsupported source type: {endpoint.SourceType}")
        };
    }

    private async Task<Dictionary<string, object>?> GetCsvDataAsync(
        ApiEndpoint endpoint,
        Dictionary<string, object> record,
        CancellationToken cancellationToken)
    {
        // Build composite key from input record with field mapping support
        var compositeKey = BuildCompositeKeyFromRecord(endpoint, record);

        if (compositeKey.Count == 0)
        {
            _logger.LogWarning("Could not build composite key for {EndpointName}", endpoint.Name);
            return null;
        }

        // Log the composite key for debugging
        var keyString = string.Join(", ", compositeKey.Select(kvp => $"{kvp.Key}={kvp.Value}"));
        _logger.LogDebug("Looking up {EndpointName} with composite key: {CompositeKey}",
            endpoint.Name, keyString);

        // Get from cache using the mapped keys
        var cachedData = await _dataSourceCacheService.GetCachedDataAsync(
            endpoint.Name,
            compositeKey,
            cancellationToken);

        if (cachedData != null)
        {
            Interlocked.Increment(ref _cacheHits);
            _logger.LogDebug("Cache hit for {EndpointName}", endpoint.Name);
        }
        else
        {
            Interlocked.Increment(ref _cacheMisses);
            _logger.LogWarning("Cache miss for {EndpointName} with key: {CompositeKey}",
                endpoint.Name, keyString);
        }

        return cachedData;
    }

    private Dictionary<string, object> BuildCompositeKeyFromRecord(
            ApiEndpoint endpoint,
            Dictionary<string, object> record)
    {
        var compositeKey = new Dictionary<string, object>();

        if (endpoint.CompositeKey == null || !endpoint.CompositeKey.Any())
        {
            _logger.LogWarning("No CompositeKey defined for {EndpointName}", endpoint.Name);
            return compositeKey;
        }

        _logger.LogDebug("Building composite key for {EndpointName}. Input record has {Count} fields: {Fields}",
            endpoint.Name, record.Count, string.Join(", ", record.Keys));

        foreach (var keyField in endpoint.CompositeKey)
        {
            // Check if there's a mapping for this field
            string datasourceFieldName = keyField;

            if (endpoint.CompositeKeyMapping != null &&
                endpoint.CompositeKeyMapping.TryGetValue(keyField, out var mappedField))
            {
                // Use the mapped field name for the cache key
                datasourceFieldName = mappedField;

                _logger.LogDebug("Mapping composite key field: {InputField} -> {DatasourceField}",
                    keyField, mappedField);
            }

            // Get value from input record using the original field name
            if (record.TryGetValue(keyField, out var value))
            {
                if (value == null || (value is string str && string.IsNullOrWhiteSpace(str)))
                {
                    _logger.LogWarning("Composite key field '{KeyField}' is null or empty in input record for {EndpointName}",
                        keyField, endpoint.Name);
                    continue;
                }

                // Store in composite key using the datasource field name
                compositeKey[datasourceFieldName] = value;
                _logger.LogDebug("Added to composite key: {DatasourceField} = {Value}",
                    datasourceFieldName, value);
            }
            else
            {
                _logger.LogWarning("Composite key field '{KeyField}' not found in input record for {EndpointName}. Available fields: {AvailableFields}",
                    keyField, endpoint.Name, string.Join(", ", record.Keys));
            }
        }

        _logger.LogDebug("Final composite key for {EndpointName}: {CompositeKey}",
            endpoint.Name, string.Join(", ", compositeKey.Select(kvp => $"{kvp.Key}={kvp.Value}")));

        return compositeKey;
    }

    private async Task<Dictionary<string, object>?> GetDatabaseDataAsync(
        ApiEndpoint endpoint,
        Dictionary<string, object> record,
        CancellationToken cancellationToken)
    {
        var compositeKey = new Dictionary<string, object>();

        if (endpoint.Parameters != null)
        {
            foreach (var param in endpoint.Parameters)
            {
                if (record.TryGetValue(param, out var value))
                {
                    compositeKey[param] = value;
                }
            }
        }

        var cachedData = await _dataSourceCacheService.GetCachedDataAsync(
            endpoint.Name,
            compositeKey,
            cancellationToken);

        if (cachedData != null)
        {
            Interlocked.Increment(ref _cacheHits);
        }
        else
        {
            Interlocked.Increment(ref _cacheMisses);
        }

        return cachedData;
    }

    private async Task<Dictionary<string, object>?> GetApiDataAsync(
        ApiEndpoint endpoint,
        Dictionary<string, object> record,
        CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref _totalApiCalls);

        var cacheKey = GenerateCacheKey(endpoint, record);
        var cachedResult = await _cacheService.GetAsync<Dictionary<string, object>>(cacheKey);

        if (cachedResult != null)
        {
            Interlocked.Increment(ref _cacheHits);
            _logger.LogDebug("API cache hit: {CacheKey}", cacheKey);
            return cachedResult;
        }

        Interlocked.Increment(ref _cacheMisses);

        // Call API and flatten response
        var apiResult = await CallApiAsync(endpoint, record, cancellationToken);

        if (apiResult != null)
        {
            // Flatten the API response into a dictionary
            var flattenedResult = FlattenApiResponse(apiResult, endpoint.Name);

            // Cache the flattened response
            var cacheDuration = TimeSpan.FromMinutes(endpoint.CacheDurationMinutes);
            await _cacheService.SetAsync(cacheKey, flattenedResult, cacheDuration);

            return flattenedResult;
        }
        else
        {
            Interlocked.Increment(ref _apiFailures);
        }

        return null;
    }

    private Dictionary<string, object> FlattenApiResponse(object apiResponse, string endpointName)
    {
        var result = new Dictionary<string, object>();

        try
        {
            // If the response is already a dictionary, use it
            if (apiResponse is Dictionary<string, object> dict)
            {
                return dict;
            }

            // If it's a JsonElement, parse it
            if (apiResponse is JsonElement jsonElement)
            {
                return FlattenJsonElement(jsonElement);
            }

            // Try to serialize and deserialize to get a dictionary
            var json = JsonSerializer.Serialize(apiResponse);
            var deserializedDict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);

            return deserializedDict ?? new Dictionary<string, object>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to flatten API response from {EndpointName}, returning empty dictionary",
                endpointName);
            return result;
        }
    }

    private Dictionary<string, object> FlattenJsonElement(JsonElement element)
    {
        var result = new Dictionary<string, object>();

        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                result[property.Name] = GetJsonElementValue(property.Value);
            }
        }

        return result;
    }

    private object GetJsonElementValue(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString() ?? string.Empty,
            JsonValueKind.Number => element.TryGetInt64(out var longVal) ? longVal : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null!,
            JsonValueKind.Object => FlattenJsonElement(element),
            JsonValueKind.Array => element.EnumerateArray().Select(GetJsonElementValue).ToArray(),
            _ => element.ToString()
        };
    }

    private async Task<object?> CallApiAsync(
        ApiEndpoint apiConfig,
        Dictionary<string, object> record,
        CancellationToken cancellationToken)
    {
        var httpClient = _httpClientFactory.CreateClient(apiConfig.Name);
        httpClient.Timeout = TimeSpan.FromSeconds(apiConfig.TimeoutSeconds);

        var url = BuildUrl(apiConfig.Url ?? string.Empty, record);
        var request = new HttpRequestMessage(new HttpMethod(apiConfig.Method ?? "GET"), url);

        if (!string.IsNullOrEmpty(apiConfig.AuthenticationHeader) &&
            !string.IsNullOrEmpty(apiConfig.AuthenticationToken))
        {
            request.Headers.Add(apiConfig.AuthenticationHeader, apiConfig.AuthenticationToken);
        }

        if (apiConfig.Method == "POST" && apiConfig.RequestBodyTemplate != null)
        {
            var bodyJson = BuildRequestBody(apiConfig.RequestBodyTemplate, record);
            request.Content = new StringContent(bodyJson, Encoding.UTF8, "application/json");
        }

        for (int attempt = 0; attempt <= apiConfig.RetryCount; attempt++)
        {
            try
            {
                var response = await httpClient.SendAsync(request, cancellationToken);

                if ((int)response.StatusCode == apiConfig.ExpectedStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync(cancellationToken);
                    return JsonSerializer.Deserialize<JsonElement>(content);
                }

                if (attempt == apiConfig.RetryCount)
                {
                    _logger.LogError("API {ApiName} failed with status {StatusCode}",
                        apiConfig.Name, response.StatusCode);
                    return null;
                }

                await Task.Delay(1000 * (attempt + 1), cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                if (attempt == apiConfig.RetryCount)
                {
                    _logger.LogError(ex, "API {ApiName} failed after {RetryCount} retries",
                        apiConfig.Name, apiConfig.RetryCount);
                    return null;
                }
                await Task.Delay(1000 * (attempt + 1), cancellationToken);
            }
        }

        return null;
    }

    private string GenerateCacheKey(ApiEndpoint apiConfig, Dictionary<string, object> record)
    {
        var keyParts = new List<string> { "api", apiConfig.Name };

        foreach (var paramName in apiConfig.CacheKeyParameters)
        {
            if (record.TryGetValue(paramName, out var paramValue))
            {
                keyParts.Add(paramValue?.ToString() ?? "null");
            }
        }

        return string.Join(":", keyParts);
    }

    private string BuildUrl(string urlTemplate, Dictionary<string, object> record)
    {
        var parameterValues = new List<object>();
        var formatString = urlTemplate;

        var matches = Regex.Matches(urlTemplate, @"{([^}]+)}");

        foreach (Match match in matches)
        {
            var paramName = match.Groups[1].Value;
            var paramValue = record.TryGetValue(paramName, out var value) ? value : string.Empty;
            parameterValues.Add(paramValue);
            formatString = formatString.Replace($"{{{paramName}}}", $"{{{parameterValues.Count - 1}}}");
        }

        return string.Format(formatString, parameterValues.ToArray());
    }

    private string BuildRequestBody(Dictionary<string, object> template, Dictionary<string, object> record)
    {
        var body = new Dictionary<string, object>();

        foreach (var kvp in template)
        {
            var value = kvp.Value;

            if (value is string stringValue)
            {
                value = ReplacePlaceholders(stringValue, record);
            }

            body[kvp.Key] = value;
        }

        return JsonSerializer.Serialize(body);
    }

    private string ReplacePlaceholders(string template, Dictionary<string, object> record)
    {
        var result = template;

        foreach (var kvp in record)
        {
            result = result.Replace($"{{{kvp.Key}}}", kvp.Value?.ToString() ?? "");
        }

        var nowMatch = Regex.Match(result, @"{utcNow:([^}]+)}");
        if (nowMatch.Success)
        {
            var format = nowMatch.Groups[1].Value;
            result = result.Replace(nowMatch.Value, DateTime.UtcNow.ToString(format));
        }

        return result;
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

        var userUpdateResponse = await _iterableService.UpdateUserAsync(request, _iterableOptions.Token, cancellationToken);
        return userUpdateResponse != null && userUpdateResponse.Code == "Success";
    }

    private void ResetStatistics()
    {
        _totalApiCalls = 0;
        _cacheHits = 0;
        _cacheMisses = 0;
        _apiFailures = 0;
    }

    private void LogStatistics()
    {
        var totalCalls = _totalApiCalls + _cacheHits;
        var cacheHitRate = totalCalls > 0 ? (_cacheHits * 100.0) / totalCalls : 0;

        _logger.LogInformation(
            "Processing Statistics - Total Calls: {TotalCalls}, Cache Hits: {CacheHits}, " +
            "Cache Misses: {CacheMisses}, API Failures: {ApiFailures}, Hit Rate: {HitRate:F1}%",
            totalCalls, _cacheHits, _cacheMisses, _apiFailures, cacheHitRate);
    }
}