using System;
using System.Text.Json;
using Azure.Messaging.ServiceBus;
using Colibri.Job.Datafeed.Models;
using Colibri.Job.Datafeed.Options;
using Colibri.Job.Datafeed.Processor;
using Colibri.Job.Datafeed.Services;
using Microsoft.Extensions.Azure;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Serilog.Context;

namespace Colibri.Job.Datafeed.Services;

/// <summary>
/// Simplified CSV processing service
/// Assumes cache is already warmed up by DedicatedCacheWarmupService
/// Listens to "csv-processing" subscription
/// Can run with multiple replicas (3+ pods) - no cache loading race conditions!
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

        var processorOptions = new ServiceBusProcessorOptions
        {
            AutoCompleteMessages = false,
            MaxConcurrentCalls = 1, // Process one message at a time
            PrefetchCount = 0,
            MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(30),
            ReceiveMode = ServiceBusReceiveMode.PeekLock
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
    }

    private Task ProcessErrorAsync(ProcessErrorEventArgs args)
    {
        _logger.LogWarning("Service Bus Error: Identifier={Identifier}, Source={ErrorSource}, Exception={Exception}",
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
                await args.CompleteMessageAsync(args.Message);

                _logger.LogInformation("Successfully processed CSV message: {MessageId}", messageId);
            }
            catch (CacheNotAvailableException ex)
            {
                _logger.LogError(ex, "Required cache not available: {MessageId}", messageId);

                // Don't dead-letter - abandon so it can be retried after cache warmup
                await args.AbandonMessageAsync(args.Message);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Message processing cancelled: {MessageId}", messageId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message: {MessageId}", messageId);

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

    private async Task VerifyRequiredDatasourcesAsync(
        List<string> requiredDatasources,
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

        foreach (var datasourceName in requiredDatasources)
        {
            var isCached = await _dataSourceCacheService.IsCachedAsync(datasourceName, cancellationToken);

            if (!isCached)
            {
                _logger.LogWarning("Required datasource not cached: {DatasourceName}", datasourceName);
                missingDatasources.Add(datasourceName);
            }
            else
            {
                _logger.LogDebug("Required datasource is cached: {DatasourceName}", datasourceName);
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

/// <summary>
/// Exception thrown when required cache is not available
/// </summary>
public class CacheNotAvailableException : Exception
{
    public CacheNotAvailableException(string message) : base(message)
    {
    }
}