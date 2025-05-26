using Amazon.SQS;
using Azure.Core;
using Colibri.ExternalServices;
using Colibri.ExternalServices.Contracts;
using Colibri.Job.Models;
using Microsoft.Extensions.Logging;
using Polly.Fallback;
using Polly.Retry;
using Polly;
using System.Text.Json;
using System.Threading;
using Amazon.Runtime.Internal;

namespace Colibri.Job.Processor
{
    public class AmazonSQSMessageProcessor : IMessageProcessor<RawMessageDelivery>
    {
        private readonly ILogger<AmazonSQSMessageProcessor> _logger;
        private readonly IIterableService _iterableService;
        private readonly IDigitalCommunicationService _digitalCommunicationService;
        private readonly IAmazonSQS _sqsClient;
        private readonly ResiliencePipeline<StaticListResponse?> _resiliencePipelineList;
        private readonly ResiliencePipeline<SubscriberListResponse?> _resiliencePipelineSubscriber;
        private readonly ResiliencePipeline<CreateCampaginResponse?> _resiliencePipelineCampaign;

        public AmazonSQSMessageProcessor(IAmazonSQS sqsClient
            , IIterableService iterableService
            , IDigitalCommunicationService digitalCommunicationService
            , ILogger<AmazonSQSMessageProcessor> logger)
        {
            _sqsClient = sqsClient;
            _iterableService = iterableService;
            _digitalCommunicationService = digitalCommunicationService;
            _logger = logger;
            _resiliencePipelineList = new ResiliencePipelineBuilder<StaticListResponse?>()
                .AddRetry(new RetryStrategyOptions<StaticListResponse?>
                {
                    Delay = TimeSpan.FromSeconds(20),
                    MaxRetryAttempts = 5,
                    BackoffType = DelayBackoffType.Exponential,
                    OnRetry = args =>
                    {
                        _logger.LogInformation("CreateBlastList {@retry} {@duration}", args.AttemptNumber, args.Duration);
                        _logger.LogError(args.Outcome.Exception, "CreateBlastList an error ocurred");
                        return default;
                    },
                    UseJitter = true
                })
                .Build();

            _resiliencePipelineSubscriber = new ResiliencePipelineBuilder<SubscriberListResponse?>()
                .AddRetry(new RetryStrategyOptions<SubscriberListResponse?>
                {
                    Delay = TimeSpan.FromSeconds(20),
                    MaxRetryAttempts = 5,
                    BackoffType = DelayBackoffType.Exponential,
                    OnRetry = args =>
                    {
                        _logger.LogInformation("CreateBlastListSubscribers {@retry} {@duration}", args.AttemptNumber, args.Duration);
                        _logger.LogError(args.Outcome.Exception, "CreateBlastListSubscribers an error ocurred");
                        return default;
                    },
                    UseJitter = true
                })
                .Build();

            _resiliencePipelineCampaign = new ResiliencePipelineBuilder<CreateCampaginResponse?>()
                .AddRetry(new RetryStrategyOptions<CreateCampaginResponse?>
                {
                    Delay = TimeSpan.FromSeconds(20),
                    MaxRetryAttempts = 5,
                    BackoffType = DelayBackoffType.Exponential,
                    OnRetry = args =>
                    {
                        _logger.LogInformation("CreateBlastCampaign {@retry} {@duration}", args.AttemptNumber, args.Duration);
                        _logger.LogError(args.Outcome.Exception, "CreateBlastCampaign an error ocurred" );
                        return default;
                    },
                    UseJitter = true
                })
                .Build();
        }

        public async Task ProcessMessageAsync(RawMessageDelivery rawMessageDelivery, CancellationToken cancellationToken)
        {
            var blastRequest = JsonSerializer.Deserialize<BlastRequest>(rawMessageDelivery.Message);

            if (blastRequest != null)
            {
                var project = await _digitalCommunicationService.GetProjectDb(blastRequest.Campaign.ProjectId);

                if (project != null)
                {
                    ResilienceContext context = ResilienceContextPool.Shared.Get(cancellationToken);

                    var blastListRequest = new BlastListRequest(blastRequest.Campaign.CampaignCount, blastRequest.ListNameFormat, blastRequest.ListDescriptionFormat);

                    var listIds = await CreateBlastList(blastListRequest, project.ApiKey, context, cancellationToken);

                    await Task.Delay(30000, cancellationToken);

                    var blastCampaignRequest = new BlastCampaignRequest(listIds, blastRequest.Campaign.Name, blastRequest.SourceTemplateId, Convert.ToDateTime(blastRequest.SendAt), blastRequest.IntervalTime, blastRequest.SourceSupressionList);

                    var blastCampaignResponse = await CreateBlastCampaign(blastCampaignRequest, project.ApiKey, context, cancellationToken);

                    await Task.Delay(30000, cancellationToken);

                    var blastListSubscriberRequest = new BlastListSubscriberRequest(blastRequest.BatchSize, blastRequest.SourceListId, listIds);

                    var blastListSubscriberResponse = await CreateBlastListSubscribers(blastListSubscriberRequest, project.ApiKey, context, cancellationToken);

                    _logger.LogInformation("PostCampaignListDb Start {CampaignName} {Size}", blastRequest.Campaign.Name, blastListSubscriberResponse.Count);

                    for (int i = 0; i < blastListSubscriberResponse.Count; i++)
                    {
                        var subscriberList = blastListSubscriberResponse[i];
                        var campaign = blastCampaignResponse[i];
                        var listDbResponse = await _digitalCommunicationService.PostCampaignListDb(new Shared.ViewModels.CampaignListCreateViewModel
                        {
                            Emails = subscriberList.Emails,
                            IterableCampaignId = campaign.CampaignId,
                            SendAt = campaign.SendAt,
                            IterableListId = subscriberList.ListId,
                            IterableTemplateId = blastRequest.SourceTemplateId,
                            Name = string.Format(blastRequest.ListNameFormat, i + 1),
                            Order = (short)(i + 1)
                        }, blastRequest.Campaign.Id);
                        await Task.Delay(8000, cancellationToken);
                    }

                    _logger.LogInformation("PutCampaignDb Start {CampaignName}", blastRequest.Campaign.Name);

                    await _digitalCommunicationService.PutCampaignDb(blastRequest.Campaign.Id, new Shared.ViewModels.CampaignUpdateViewModel
                    {
                        Id = blastRequest.Campaign.Id,
                        Tags = blastRequest.Campaign.Tags,
                        Status = Shared.CampaignStatus.Done,
                        UpdatedBy = "Colibri.Job",
                        UpdatedDate = DateTimeOffset.UtcNow
                    });

                    _logger.LogInformation("PutCampaignDb Completed {CampaignName}", blastRequest.Campaign.Name);
                }
            }
        }

        private async Task<IEnumerable<long>> CreateBlastList(BlastListRequest request, string token, ResilienceContext context, CancellationToken cancellationToken)
        {
            List<long> dataResponse = [];
            for (int i = 1; i <= request.CampaignCount; i++)
            {
                string listDescription = string.Format(request.ListDescriptionFormat, i);
                string listName = string.Format(request.ListNameFormat, i);
                var staticListRequest = new StaticListRequest(listDescription, listName);

                var staticListResponse = await _resiliencePipelineList.ExecuteAsync(async context =>
                  {
                      _logger.LogInformation("CreateBlast - CreateStaticList Send {0}", staticListRequest);
                      return await _iterableService.CreateStaticList(staticListRequest, token, context.CancellationToken);
                  },
                  context);

                await Task.Delay(5000, cancellationToken);
                if (staticListResponse != null)
                {
                    _logger.LogInformation("CreateBlast - CreateStaticList {0}", staticListResponse.ListId);
                    dataResponse.Add(staticListResponse.ListId);
                }
            }
            return dataResponse;
        }

        private async Task<List<BlastListSubscriberResponse>> CreateBlastListSubscribers(BlastListSubscriberRequest request, string token, ResilienceContext context, CancellationToken cancellationToken)
        {
            List<BlastListSubscriberResponse> dataResponse = [];
            var emails = await _iterableService.GetListUsers(request.SourceListId, false, token);

            if (emails != null)
            {
                IEnumerable<string[]> emailChunk = emails.Chunk(request.BatchSize);

                for (int i = 0; i < request.ListIds.Count(); i++)
                {
                    List<SubscriberDto> chunk = [.. emailChunk.ElementAt(i).Select(email => new SubscriberDto(email))];

                    var listId = request.ListIds.ElementAt(i);

                    var subscriberListRequest = new SubscriberListRequest(listId, chunk, true);

                    var subscriberListResponse = await _resiliencePipelineSubscriber.ExecuteAsync(async context =>
                    {
                        _logger.LogInformation("CreateBlast - CreateSubscriberList Send {0}", subscriberListRequest);
                        return await _iterableService.CreateSubscriberList(subscriberListRequest, token, context.CancellationToken);
                    },
                    context);

                    await Task.Delay(5000, cancellationToken);
                    if (subscriberListResponse != null)
                    {
                        _logger.LogInformation("CreateBlast - CreateSubscriberList {0}", subscriberListResponse.SuccessCount);
                        dataResponse.Add(new BlastListSubscriberResponse(listId, emailChunk.ElementAt(i)));
                    }
                }
            }
            return dataResponse;
        }

        private async Task<List<BlastCampaignResponse>> CreateBlastCampaign(BlastCampaignRequest request, string token, ResilienceContext context, CancellationToken cancellationToken)
        {
            List<BlastCampaignResponse> dataResponse = [];
            List<long>? suppresionLists = request.SupressionList != null ? [request.SupressionList.Value] : null;

            for (int i = 0; i < request.ListIds.Count(); i++)
            {
                var listId = request.ListIds.ElementAt(i);

                var sendScheduleDate = request.SendAt.AddMinutes(request.IntervalTime * i);
                string sendDate = sendScheduleDate.ToString("yyyy-MM-dd HH:mm:ss");
                var createCampaignRequest = new CreateCampaignRequest([listId], request.CampaignName, sendDate, request.TemplateId, suppresionLists);

                var createCampaignResponse = await _resiliencePipelineCampaign.ExecuteAsync(async context =>
                {
                    _logger.LogInformation("CreateBlast - CreateCampagin Send {0}", createCampaignRequest);
                    return await _iterableService.CreateCampagin(createCampaignRequest, token, context.CancellationToken);
                },
                context);

                await Task.Delay(5000, cancellationToken);
                if (createCampaignResponse != null)
                {
                    _logger.LogInformation("CreateBlast - CreateCampagin {0}", createCampaignResponse.CampaignId);
                    dataResponse.Add(new BlastCampaignResponse(createCampaignResponse.CampaignId, sendDate));
                }
            }

            return dataResponse;
        }
    }
}
