using Amazon.SQS;
using Amazon.SQS.Model;
using Colibri.Shared;
using Colibri.Job.Models;
using Colibri.Job.Options;
using Colibri.Job.Processor;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Serilog.Context;

namespace Colibri.Job.Services
{
    public class AWSSQSProcessingService: BackgroundService
    {
        private readonly IAmazonSQS _sqsClient;
        private readonly ILogger<AWSSQSProcessingService> _logger;
        private readonly IMessageProcessor<RawMessageDelivery> _messageProcessor;
        private readonly SQSOptions _sqsOptions;
        private CancellationTokenSource? _cancellationTokenSource;

        public AWSSQSProcessingService(IAmazonSQS sqsClient, ILogger<AWSSQSProcessingService> logger, IMessageProcessor<RawMessageDelivery> messageProcessor, IOptions<SQSOptions> options)
        {
            _sqsClient = sqsClient;
            _logger = logger;
            _messageProcessor = messageProcessor;
            _sqsOptions = options.Value;
        }

        private async Task<ReceiveMessageResponse> GetMessage(
            CancellationToken cancellationToken)
        {
            return await _sqsClient.ReceiveMessageAsync(new ReceiveMessageRequest
            {
                QueueUrl = _sqsOptions.QUrl,
                MaxNumberOfMessages = _sqsOptions.MaxNumberOfMessages,
                WaitTimeSeconds = _sqsOptions.WaitTimeSeconds,
                //MessageAttributeNames = _sqsOptions.MessageAttributeNames,
            }, cancellationToken);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var receiveMessageResponse = await GetMessage(stoppingToken);
                    if (receiveMessageResponse.Messages != null && receiveMessageResponse.Messages.Count > 0)
                    {
                        foreach (var rawMessage in receiveMessageResponse.Messages)
                        {
                            GlobalLogContext.PushProperty("MessageId", rawMessage.MessageId);
                            var message = JsonConvert.DeserializeObject<RawMessageDelivery>(rawMessage.Body);
                            _logger.LogWithContext(() => _logger.LogInformation("SQS Received Message from Queue {@messageId}", rawMessage.MessageId),
                                new KeyValuePair<string, object>("Body", JsonConvert.SerializeObject(message)));

                            _logger.LogInformation("SQS Processing Message");
                            await _messageProcessor.ProcessMessageAsync(message, stoppingToken);
                            _logger.LogInformation("SQS Deleting Message");
                            await _sqsClient.DeleteMessageAsync(_sqsOptions.QUrl, rawMessage.ReceiptHandle, stoppingToken);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "SQS and error ocurred");
                }
            }
        }
    }
}
