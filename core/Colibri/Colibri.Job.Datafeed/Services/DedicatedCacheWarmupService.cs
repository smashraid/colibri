using System.Text.Json;
using Azure.Messaging.ServiceBus;
using Colibri.Job.Datafeed.Models;
using Colibri.Job.Datafeed.Options;
using Colibri.Job.Datafeed.Processor;
using Microsoft.Extensions.Azure;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Serilog.Context;

namespace Colibri.Job.Datafeed.Services;

/// <summary>
/// Dedicated service for warming up cache based on Azure Service Bus messages
/// Listens to "cache-warmup" subscription
/// Should run with 1 replica only - no need for distributed locks!
/// </summary>
public class DedicatedCacheWarmupService : BackgroundService, IAsyncDisposable
{
    private readonly ServiceBusClient _serviceBusClient;
    private readonly AzureServiceBusOptions _azureServiceBusOptions;
    private readonly ServiceBusProcessor _processor;
    private readonly ILogger<DedicatedCacheWarmupService> _logger;
    private readonly ICsvProcessor _csvProcessor;
    private readonly ITableStorageService _tableStorageService;
    private readonly IDataSourceCacheService _dataSourceCacheService;
    private readonly IRetryPolicyService _retryPolicyService;
    private CancellationTokenSource? _cancellationTokenSource;

    public DedicatedCacheWarmupService(
        IAzureClientFactory<ServiceBusClient> azureClientFactory,
        ICsvProcessor csvProcessor,
        ITableStorageService tableStorageService,
        IDataSourceCacheService dataSourceCacheService,
        IRetryPolicyService retryPolicyService,
        ILogger<DedicatedCacheWarmupService> logger,
        IOptions<AzureServiceBusOptions> azureServiceBusOptions)
    {
        _azureServiceBusOptions = azureServiceBusOptions.Value;
        _serviceBusClient = azureClientFactory.CreateClient(_azureServiceBusOptions.Name);

        var processorOptions = new ServiceBusProcessorOptions
        {
            AutoCompleteMessages = _azureServiceBusOptions.Options.AutoCompleteMessages,
            MaxConcurrentCalls = _azureServiceBusOptions.Options.MaxConcurrentCalls,
            PrefetchCount = _azureServiceBusOptions.Options.PrefetchCount,
            MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(_azureServiceBusOptions.Options.MaxAutoLockRenewalDurationMinutes),
            ReceiveMode = _azureServiceBusOptions.Options.ReceiveMode.ToLower() == "receiveanddelete"
                     ? ServiceBusReceiveMode.ReceiveAndDelete
                     : ServiceBusReceiveMode.PeekLock
        };

        // Use dedicated subscription for cache warmup
        var warmupSubscription = _azureServiceBusOptions.WarmupSubscription ?? "cache-warmup";

        _processor = _serviceBusClient.CreateProcessor(
            _azureServiceBusOptions.Topic,
            warmupSubscription,
            processorOptions);

        _processor.ProcessMessageAsync += ProcessWarmupMessageAsync;
        _processor.ProcessErrorAsync += ProcessErrorAsync;

        _csvProcessor = csvProcessor;
        _tableStorageService = tableStorageService;
        _dataSourceCacheService = dataSourceCacheService;
        _retryPolicyService = retryPolicyService;
        _logger = logger;
    }

    private Task ProcessErrorAsync(ProcessErrorEventArgs args)
    {
        _logger.LogWarning("Service Bus Error in Cache Warmup: Identifier={Identifier}, Source={ErrorSource}, Exception={Exception}",
            args.Identifier,
            args.ErrorSource,
            args.Exception.Message);

        return Task.CompletedTask;
    }

    private async Task ProcessWarmupMessageAsync(ProcessMessageEventArgs args)
    {
        var messageId = args.Message.MessageId;

        using (LogContext.PushProperty("MessageId", messageId))
        {
            try
            {
                _logger.LogInformation("Received cache warmup message: {MessageId}", messageId);

                var body = args.Message.Body.ToString();
                var warmupMessage = JsonSerializer.Deserialize<CacheWarmupMessage>(body);

                if (warmupMessage == null)
                {
                    _logger.LogError("Failed to deserialize warmup message body");
                    await args.DeadLetterMessageAsync(args.Message, "DeserializationFailed",
                        "Could not deserialize message body to CacheWarmupMessage");
                    return;
                }

                // Validate message type
                if (warmupMessage.MessageType != "CacheWarmup")
                {
                    _logger.LogError("Invalid message type: {MessageType}", warmupMessage.MessageType);
                    await args.DeadLetterMessageAsync(args.Message, "InvalidMessageType",
                        $"Expected 'CacheWarmup', got '{warmupMessage.MessageType}'");
                    return;
                }

                // Process warmup
                await ProcessCacheWarmupAsync(warmupMessage, args.CancellationToken);

                // Complete the message
                await args.CompleteMessageAsync(args.Message);

                _logger.LogInformation("Successfully completed cache warmup: {MessageId}", messageId);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Cache warmup cancelled: {MessageId}", messageId);
                // Don't complete - let it be retried
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing cache warmup message: {MessageId}", messageId);

                if (args.Message.DeliveryCount >= 3)
                {
                    await args.DeadLetterMessageAsync(args.Message, "ProcessingFailed",
                        $"Failed after {args.Message.DeliveryCount} attempts: {ex.Message}");
                }
                else
                {
                    await args.AbandonMessageAsync(args.Message);
                }
            }
        }
    }

    private async Task ProcessCacheWarmupAsync(
        CacheWarmupMessage message,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting cache warmup for {Count} datasources",
            message.DataSources.Count);

        var startTime = DateTime.UtcNow;
        var successCount = 0;
        var failureCount = 0;

        foreach (var datasource in message.DataSources)
        {
            if (cancellationToken.IsCancellationRequested)
            {
                _logger.LogWarning("Cache warmup cancelled");
                break;
            }

            try
            {
                await WarmupDatasourceAsync(datasource, cancellationToken);
                successCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to warm up datasource: {Name}", datasource.Name);
                failureCount++;
                // Continue with other datasources
            }
        }

        var duration = DateTime.UtcNow - startTime;

        _logger.LogInformation(
            "Cache warmup completed in {Duration:F2}s. Success: {Success}, Failed: {Failed}",
            duration.TotalSeconds, successCount, failureCount);

        if (failureCount > 0)
        {
            throw new InvalidOperationException(
                $"Cache warmup had {failureCount} failures out of {message.DataSources.Count} datasources");
        }
    }

    private async Task WarmupDatasourceAsync(
        DataSourceConfiguration datasource,
        CancellationToken cancellationToken)
    {
        var sourceName = datasource.Name;
        var sourceType = datasource.SourceType.ToUpper();

        _logger.LogInformation("Warming up {SourceType}: {SourceName}", sourceType, sourceName);

        try
        {
            // Check if already cached and fresh
            var isCached = await _dataSourceCacheService.IsCachedAsync(sourceName, cancellationToken);
            var shouldRefresh = await _tableStorageService.ShouldRefreshCacheAsync(
                sourceType,
                sourceName,
                cancellationToken);

            if (isCached && !shouldRefresh)
            {
                _logger.LogInformation(
                    "{SourceType}: {SourceName} is already cached and fresh. Skipping.",
                    sourceType, sourceName);
                return;
            }

            // Load datasource with retry policy
            var blobRetryPipeline = _retryPolicyService.GetBlobDownloadRetryPipeline();

            await blobRetryPipeline.ExecuteAsync(async ct =>
            {
                await LoadAndCacheDatasourceAsync(datasource, ct);
            }, cancellationToken);

            // Mark as refreshed in table storage
            await _tableStorageService.UpdateLastRefreshedAsync(
                sourceType,
                sourceName,
                cancellationToken);

            _logger.LogInformation("Successfully warmed up {SourceType}: {SourceName}",
                sourceType, sourceName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error warming up {SourceType}: {SourceName}",
                sourceType, sourceName);
            throw;
        }
    }

    private async Task LoadAndCacheDatasourceAsync(
        DataSourceConfiguration datasource,
        CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;
        var endpoint = ConvertToApiEndpoint(datasource);

        List<Dictionary<string, object>> data;

        if (datasource.SourceType.Equals("CSV", StringComparison.OrdinalIgnoreCase))
        {
            data = await _csvProcessor.ReadCsvDataSourceAsync(endpoint, cancellationToken);
        }
        else if (datasource.SourceType.Equals("Database", StringComparison.OrdinalIgnoreCase))
        {
            data = await _csvProcessor.ReadDatabaseDataSourceAsync(endpoint, cancellationToken);
        }
        else
        {
            throw new NotSupportedException($"Unsupported source type for warmup: {datasource.SourceType}");
        }

        var loadDuration = DateTime.UtcNow - startTime;
        _logger.LogInformation("Loaded {Count} rows in {Duration:F2}s",
            data.Count, loadDuration.TotalSeconds);

        // Cache the data
        var cacheStartTime = DateTime.UtcNow;
        var expiration = TimeSpan.FromMinutes(datasource.CacheDurationMinutes);
        var compositeKeyFields = datasource.CompositeKey ?? new List<string>();

        await _dataSourceCacheService.CacheDataSourceAsync(
            datasource.Name,
            data,
            compositeKeyFields,
            datasource.CompositeKeyMapping,
            expiration,
            cancellationToken);

        var cacheDuration = DateTime.UtcNow - cacheStartTime;
        _logger.LogInformation("Cached {Count} rows in {Duration:F2}s",
            data.Count, cacheDuration.TotalSeconds);
    }

    private ApiEndpoint ConvertToApiEndpoint(DataSourceConfiguration config)
    {
        return new ApiEndpoint
        {
            Name = config.Name,
            SourceType = config.SourceType,
            FilePath = config.FilePath,
            ConnectionString = config.ConnectionString,
            DatabaseType = config.DatabaseType,
            Query = config.Query,
            CommandType = config.CommandType,
            HasHeader = config.HasHeader,
            CompositeKey = config.CompositeKey,
            CompositeKeyMapping = config.CompositeKeyMapping,
            Columns = config.Columns,
            Parameters = config.Parameters,
            CacheDurationMinutes = config.CacheDurationMinutes,
            TimeoutSeconds = config.TimeoutSeconds
        };
    }

    public async ValueTask DisposeAsync()
    {
        if (_processor != null)
        {
            await _processor.DisposeAsync();
        }

        _cancellationTokenSource?.Dispose();

        GC.SuppressFinalize(this);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _cancellationTokenSource = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);

        _logger.LogInformation("Starting Dedicated Cache Warmup Service");

        try
        {
            await _processor.StartProcessingAsync(stoppingToken);
            _logger.LogInformation("Cache Warmup Processor started successfully");

            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Cache Warmup Service is stopping");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in Cache Warmup Service");
            throw;
        }
        finally
        {
            _logger.LogInformation("Stopping Cache Warmup Processor");
            await _processor.StopProcessingAsync(CancellationToken.None);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Cache Warmup Service stop requested");
        await base.StopAsync(cancellationToken);
    }
}