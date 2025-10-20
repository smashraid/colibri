using System;
using System.Text.Json;
using Azure.Data.Tables;
using Azure.Messaging.ServiceBus;
using Azure.Storage.Blobs;
using Colibri.Job.Datafeed.Models;
using Colibri.Job.Datafeed.Options;
using Colibri.Job.Datafeed.Processor;
using Microsoft.Extensions.Azure;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Serilog.Context;

namespace Colibri.Job.Datafeed.Services;

internal class AzureMessageProcessingService : BackgroundService, IAsyncDisposable
{
    private readonly ServiceBusClient _serviceBusClient;
    private readonly AzureServiceBusOptions _azureServiceBusOptions;
    private readonly ServiceBusProcessor _processor;
    private readonly ILogger<AzureMessageProcessingService> _logger;
    private readonly IMessageProcessor<DataSourceConfiguration> _messageProcessor;
    private CancellationTokenSource? _cancellationTokenSource;

    public AzureMessageProcessingService(
        IAzureClientFactory<ServiceBusClient> azureClientFactory,
        IMessageProcessor<DataSourceConfiguration> messageProcessor,
        ILogger<AzureMessageProcessingService> logger,
        IOptions<AzureServiceBusOptions> azureServiceBusOptions)
    {
        _azureServiceBusOptions = azureServiceBusOptions.Value;
        _serviceBusClient = azureClientFactory.CreateClient(_azureServiceBusOptions.Name);
        var processorOptions = new ServiceBusProcessorOptions
        {
            AutoCompleteMessages = false,  // We'll complete manually
            MaxConcurrentCalls = 1,        // Process one message at a time to avoid overwhelming
            PrefetchCount = 0,             // Don't prefetch to ensure lock renewal works
            MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(30), // Auto-renew for up to 30 minutes
            ReceiveMode = ServiceBusReceiveMode.PeekLock
        };
        _processor = _serviceBusClient.CreateProcessor(
            _azureServiceBusOptions.Topic,
            _azureServiceBusOptions.Subscription,
            processorOptions);

        _processor.ProcessMessageAsync += ProcessMessageAsync;
        _processor.ProcessErrorAsync += ProcessErrorAsync;
        _messageProcessor = messageProcessor;
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
                _logger.LogInformation("Received message: {MessageId}", messageId);

                var body = args.Message.Body.ToString();
                var configuration = JsonSerializer.Deserialize<DataSourceConfiguration>(body);

                if (configuration == null)
                {
                    _logger.LogError("Failed to deserialize message body");
                    await args.DeadLetterMessageAsync(args.Message, "DeserializationFailed",
                        "Could not deserialize message body to DataSourceConfiguration");
                    return;
                }

                // Validate configuration
                if (!ValidateConfiguration(configuration))
                {
                    _logger.LogError("Invalid configuration in message");
                    await args.DeadLetterMessageAsync(args.Message, "InvalidConfiguration",
                        "DataSourceConfiguration validation failed");
                    return;
                }

                // Process the message with cancellation support
                await _messageProcessor.ProcessMessageAsync(configuration, args.CancellationToken);

                // Complete the message
                await args.CompleteMessageAsync(args.Message);

                _logger.LogInformation("Successfully processed message: {MessageId}", messageId);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Message processing cancelled: {MessageId}", messageId);
                // Don't complete the message, let it be retried
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message: {MessageId}", messageId);

                // Check if we should dead-letter or let it retry
                if (args.Message.DeliveryCount >= 3)
                {
                    await args.DeadLetterMessageAsync(args.Message, "ProcessingFailed",
                        $"Failed after {args.Message.DeliveryCount} attempts: {ex.Message}");
                }
                else
                {
                    // Abandon to retry
                    await args.AbandonMessageAsync(args.Message);
                }
            }
        }
    }

    private bool ValidateConfiguration(DataSourceConfiguration configuration)
    {
        if (configuration.CsvConfiguration == null)
        {
            _logger.LogError("CsvConfiguration is null");
            return false;
        }

        if (string.IsNullOrWhiteSpace(configuration.CsvConfiguration.FilePath))
        {
            _logger.LogError("CsvConfiguration.FilePath is required");
            return false;
        }

        if (configuration.CsvConfiguration.Columns == null || !configuration.CsvConfiguration.Columns.Any())
        {
            _logger.LogError("CsvConfiguration.Columns is required");
            return false;
        }

        if (configuration.ApiEndpoints?.Datasources != null)
        {
            foreach (var endpoint in configuration.ApiEndpoints.Datasources)
            {
                if (string.IsNullOrWhiteSpace(endpoint.SourceType))
                {
                    _logger.LogError("Endpoint.SourceType is required for endpoint: {Name}", endpoint.Name);
                    return false;
                }

                // Validate based on source type
                switch (endpoint.SourceType.ToUpper())
                {
                    case "CSV":
                        if (string.IsNullOrWhiteSpace(endpoint.FilePath))
                        {
                            _logger.LogError("FilePath is required for CSV endpoint: {Name}", endpoint.Name);
                            return false;
                        }
                        if (endpoint.CompositeKey == null || !endpoint.CompositeKey.Any())
                        {
                            _logger.LogError("CompositeKey is required for CSV endpoint: {Name}", endpoint.Name);
                            return false;
                        }
                        break;

                    case "API":
                        if (string.IsNullOrWhiteSpace(endpoint.Url))
                        {
                            _logger.LogError("Url is required for API endpoint: {Name}", endpoint.Name);
                            return false;
                        }
                        break;

                    case "DATABASE":
                        if (string.IsNullOrWhiteSpace(endpoint.ConnectionString))
                        {
                            _logger.LogError("ConnectionString is required for Database endpoint: {Name}", endpoint.Name);
                            return false;
                        }
                        if (string.IsNullOrWhiteSpace(endpoint.Query))
                        {
                            _logger.LogError("Query is required for Database endpoint: {Name}", endpoint.Name);
                            return false;
                        }
                        break;

                    default:
                        _logger.LogError("Invalid SourceType: {SourceType} for endpoint: {Name}",
                            endpoint.SourceType, endpoint.Name);
                        return false;
                }
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

        _logger.LogInformation("Starting Azure Message Processing Service");

        try
        {
            await _processor.StartProcessingAsync(stoppingToken);
            _logger.LogInformation("Azure Message Processor started successfully");

            // Wait until cancellation is requested
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Azure Message Processing Service is stopping");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in Azure Message Processing Service");
            throw;
        }
        finally
        {
            _logger.LogInformation("Stopping Azure Message Processor");
            await _processor.StopProcessingAsync(CancellationToken.None);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Azure Message Processing Service stop requested");
        await base.StopAsync(cancellationToken);
    }
}


