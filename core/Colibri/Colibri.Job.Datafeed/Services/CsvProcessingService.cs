using System.Text.Json;
using Azure.Messaging.ServiceBus;
using Colibri.Job.Datafeed.Exceptions;
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
/// CSV processing service - Processes CSV files using pre-warmed cache
/// Listens to "csv-processing" subscription
/// Can run with multiple replicas (3+ pods) - no cache loading!
/// </summary>
internal class CsvProcessingService : BackgroundService, IAsyncDisposable
{
    private readonly ServiceBusClient _serviceBusClient;
    private readonly AzureServiceBusOptions _azureServiceBusOptions;
    private readonly ServiceBusProcessor _processor;
    private readonly ILogger<CsvProcessingService> _logger;
    private readonly ICsvProcessor _csvProcessor;
    private readonly IDataSourceCacheService _dataSourceCacheService;
    private CancellationTokenSource? _cancellationTokenSource;

    public CsvProcessingService(
        IAzureClientFactory<ServiceBusClient> azureClientFactory,
        ICsvProcessor csvProcessor,
        IDataSourceCacheService dataSourceCacheService,
        ILogger<CsvProcessingService> logger,
        IOptions<AzureServiceBusOptions> azureServiceBusOptions)
    {
        _azureServiceBusOptions = azureServiceBusOptions.Value;
        _serviceBusClient = azureClientFactory.CreateClient(_azureServiceBusOptions.Name);

        // Build processor options from configuration
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

        _processor = _serviceBusClient.CreateProcessor(
            _azureServiceBusOptions.Topic,
            _azureServiceBusOptions.Subscription,
            processorOptions);

        _processor.ProcessMessageAsync += ProcessMessageAsync;
        _processor.ProcessErrorAsync += ProcessErrorAsync;

        _csvProcessor = csvProcessor;
        _dataSourceCacheService = dataSourceCacheService;
        _logger = logger;

        _logger.LogInformation(
            "CSV Processing Service initialized - Topic: {Topic}, Subscription: {Subscription}, " +
            "MaxConcurrentCalls: {MaxConcurrentCalls}, AutoComplete: {AutoComplete}",
            _azureServiceBusOptions.Topic,
            _azureServiceBusOptions.Subscription,
            processorOptions.MaxConcurrentCalls,
            processorOptions.AutoCompleteMessages);
    }

    private Task ProcessErrorAsync(ProcessErrorEventArgs args)
    {
        _logger.LogWarning(
            "Service Bus Error: Identifier={Identifier}, Source={ErrorSource}, Exception={Exception}",
            args.Identifier,
            args.ErrorSource,
            args.Exception.Message);

        return Task.CompletedTask;
    }

    private async Task ProcessMessageAsync(ProcessMessageEventArgs args)
    {
        var messageId = args.Message.MessageId;

        using (LogContext.PushProperty("MessageId", messageId))
        {
            try
            {
                _logger.LogInformation("Received CSV processing message: {MessageId}", messageId);

                var body = args.Message.Body.ToString();
                var processingMessage = JsonSerializer.Deserialize<CsvProcessingMessage>(body);

                if (processingMessage == null)
                {
                    _logger.LogError("Failed to deserialize message body");
                    await args.DeadLetterMessageAsync(args.Message, "DeserializationFailed",
                        "Could not deserialize message body to CsvProcessingMessage");
                    return;
                }

                // Validate message type
                if (processingMessage.MessageType != "CsvProcessing")
                {
                    _logger.LogError("Invalid message type: {MessageType}", processingMessage.MessageType);
                    await args.DeadLetterMessageAsync(args.Message, "InvalidMessageType",
                        $"Expected 'CsvProcessing', got '{processingMessage.MessageType}'");
                    return;
                }

                // Validate configuration
                if (!ValidateConfiguration(processingMessage))
                {
                    _logger.LogError("Invalid configuration in message");
                    await args.DeadLetterMessageAsync(args.Message, "InvalidConfiguration",
                        "CsvProcessingMessage validation failed");
                    return;
                }

                // CRITICAL: Verify all required datasources are cached
                await VerifyRequiredDatasourcesAsync(processingMessage.RequiredDatasources, args.CancellationToken);

                // Process the CSV file (cache already warm!)
                await _csvProcessor.ProcessCsvFileAsync(
                    processingMessage.CsvConfiguration,
                    processingMessage.RequiredDatasources,
                    args.CancellationToken);

                // Complete the message
                await args.CompleteMessageAsync(args.Message, args.CancellationToken);

                _logger.LogInformation("Successfully processed CSV message: {MessageId}", messageId);
            }
            catch (CacheNotAvailableException ex)
            {
                _logger.LogError(ex, "Required cache not available: {MessageId}", messageId);

                // Don't dead-letter - abandon so it can be retried after cache warmup
                await args.AbandonMessageAsync(args.Message);

                _logger.LogWarning(
                    "Message {MessageId} abandoned. Will retry after cache is warmed up.",
                    messageId);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Message processing cancelled: {MessageId}", messageId);
                // Don't complete or dead-letter - let it be retried
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message: {MessageId}", messageId);

                if (args.Message.DeliveryCount >= 3)
                {
                    await args.DeadLetterMessageAsync(args.Message, "ProcessingFailed",
                        $"Failed after {args.Message.DeliveryCount} attempts: {ex.Message}");

                    _logger.LogError(
                        "Message {MessageId} dead-lettered after {DeliveryCount} attempts",
                        messageId,
                        args.Message.DeliveryCount);
                }
                else
                {
                    await args.AbandonMessageAsync(args.Message);

                    _logger.LogWarning(
                        "Message {MessageId} abandoned. Attempt {DeliveryCount}/3",
                        messageId,
                        args.Message.DeliveryCount);
                }
            }
        }
    }

    private async Task VerifyRequiredDatasourcesAsync(
        List<DatasourceReference> requiredDatasources,
        CancellationToken cancellationToken)
    {
        if (requiredDatasources == null || !requiredDatasources.Any())
        {
            _logger.LogInformation("No required datasources specified");
            return;
        }

        _logger.LogInformation("Verifying {Count} required datasources are cached",
            requiredDatasources.Count);

        var missingDatasources = new List<string>();

        foreach (var datasourceRef in requiredDatasources)
        {
            var isCached = await _dataSourceCacheService.IsCachedAsync(
                datasourceRef.DataSourceName,
                cancellationToken);

            if (!isCached)
            {
                _logger.LogWarning(
                    "Required datasource not cached: {DatasourceName}",
                    datasourceRef.DataSourceName);
                missingDatasources.Add(datasourceRef.DataSourceName);
            }
            else
            {
                _logger.LogDebug(
                    "Required datasource is cached: {DatasourceName}",
                    datasourceRef.DataSourceName);
            }
        }

        if (missingDatasources.Any())
        {
            throw new CacheNotAvailableException(
                $"Required datasources not cached: {string.Join(", ", missingDatasources)}. " +
                $"Please send a CacheWarmup message first.");
        }

        _logger.LogInformation("All required datasources are cached and ready");
    }

    private bool ValidateConfiguration(CsvProcessingMessage message)
    {
        if (message.CsvConfiguration == null)
        {
            _logger.LogError("CsvConfiguration is null");
            return false;
        }

        if (string.IsNullOrWhiteSpace(message.CsvConfiguration.FilePath))
        {
            _logger.LogError("CsvConfiguration.FilePath is required");
            return false;
        }

        if (message.CsvConfiguration.Columns == null || !message.CsvConfiguration.Columns.Any())
        {
            _logger.LogError("CsvConfiguration.Columns is required");
            return false;
        }

        if (message.RequiredDatasources == null || !message.RequiredDatasources.Any())
        {
            _logger.LogWarning("No required datasources specified - processing without enrichment");
            return true;
        }

        // Validate each datasource reference
        foreach (var datasourceRef in message.RequiredDatasources)
        {
            if (string.IsNullOrWhiteSpace(datasourceRef.DataSourceName))
            {
                _logger.LogError("DataSourceName is required for datasource reference");
                return false;
            }

            if (string.IsNullOrWhiteSpace(datasourceRef.KeyTemplate))
            {
                _logger.LogError(
                    "KeyTemplate is required for datasource: {DatasourceName}",
                    datasourceRef.DataSourceName);
                return false;
            }
        }

        return true;
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

        _logger.LogInformation("Starting CSV Processing Service");

        try
        {
            await _processor.StartProcessingAsync(stoppingToken);
            _logger.LogInformation("CSV Processor started successfully");

            // Wait until cancellation is requested
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("CSV Processing Service is stopping");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in CSV Processing Service");
            throw;
        }
        finally
        {
            _logger.LogInformation("Stopping CSV Processor");
            await _processor.StopProcessingAsync(CancellationToken.None);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("CSV Processing Service stop requested");
        await base.StopAsync(cancellationToken);
    }
}