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

namespace Colibri.Job.Processor
{
    public class AmazonSQSMessageProcessor : IMessageProcessor<RawMessageDelivery>
    {
        private readonly ILogger<AmazonSQSMessageProcessor> _logger;
        private readonly IIterableService _iterableService;
        private readonly IDigitalCommunicationService _digitalCommunicationService;
        private readonly IAmazonSQS _sqsClient;

        public AmazonSQSMessageProcessor(IAmazonSQS sqsClient
            , IIterableService iterableService
            , IDigitalCommunicationService digitalCommunicationService
            , ILogger<AmazonSQSMessageProcessor> logger)
        {
            _sqsClient = sqsClient;
            _iterableService = iterableService;
            _digitalCommunicationService = digitalCommunicationService;
            _logger = logger;
        }

        public async Task ProcessMessageAsync(RawMessageDelivery rawMessageDelivery, CancellationToken cancellationToken)
        {
            var blastRequest = JsonSerializer.Deserialize<BlastRequest>(rawMessageDelivery.Message);

            if (blastRequest != null)
            {
                var project = await _digitalCommunicationService.GetProjectDb(blastRequest.Campaign.ProjectId);

                if (project != null)
                {
                    var blastListRequest = new BlastListRequest(blastRequest.Campaign.CampaignCount, blastRequest.ListNameFormat, blastRequest.ListDescriptionFormat);

                    var listIds = await CreateBlastList(blastListRequest, project.ApiKey, cancellationToken);

                    await Task.Delay(10000, cancellationToken);

                    var blastCampaignRequest = new BlastCampaignRequest(listIds, blastRequest.Campaign.Name, blastRequest.SourceTemplateId, Convert.ToDateTime(blastRequest.SendAt), blastRequest.IntervalTime, blastRequest.SourceSupressionList);

                    var blastCampaignResponse = await CreateBlastCampaign(blastCampaignRequest, project.ApiKey, cancellationToken);

                    await Task.Delay(10000, cancellationToken);

                    var blastListSubscriberRequest = new BlastListSubscriberRequest(blastRequest.BatchSize, blastRequest.SourceListId, listIds);

                    var blastListSubscriberResponse = await CreateBlastListSubscribers(blastListSubscriberRequest, project.ApiKey, cancellationToken);

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
                        await Task.Delay(5000, cancellationToken);
                    }

                    await _digitalCommunicationService.PutCampaignDb(blastRequest.Campaign.Id, new Shared.ViewModels.CampaignUpdateViewModel
                    {
                        Id = blastRequest.Campaign.Id,
                        Tags = blastRequest.Campaign.Tags,
                        Status = Shared.CampaignStatus.Done,
                        UpdatedBy = "Colibri.Job",
                        UpdatedDate = DateTimeOffset.UtcNow
                    });
                }
            }
        }

        private async Task<IEnumerable<long>> CreateBlastList(BlastListRequest request, string token, CancellationToken cancellationToken)
        {
            ResilienceContext context = ResilienceContextPool.Shared.Get(cancellationToken);
            var listKey = new ResiliencePropertyKey<StaticListRequest>("list-key");

            var pipeline = new ResiliencePipelineBuilder<StaticListResponse?>()
                .AddFallback(new FallbackStrategyOptions<StaticListResponse?>
                {
                    ShouldHandle = new PredicateBuilder<StaticListResponse?>()
                    .Handle<Exception>()
                    .HandleResult(r => r is null),
                    FallbackAction = args =>
                    {
                        return Outcome.FromResultAsValueTask<StaticListResponse?>(null);
                    },
                    OnFallback = args =>
                    {
                        // Add extra logic to be executed when the fallback is triggered, such as logging.
                        var customData = args.Context.Properties.GetValue(listKey, new StaticListRequest("", ""));
                        _logger.LogInformation("CreateBlastList Fallback {@request}", customData);
                        return default; // Returns an empty ValueTask
                    }
                })
                .AddRetry(new RetryStrategyOptions<StaticListResponse?>
                {
                    Delay = TimeSpan.FromSeconds(15),
                    MaxRetryAttempts = 2,
                    BackoffType = DelayBackoffType.Linear,
                    OnRetry = args =>
                    {
                        _logger.LogInformation("CreateBlastList {@retry}", args.AttemptNumber);
                        _logger.LogError(args.Outcome.Exception, "CreateBlastList an error ocurred {@request}", request);
                        return default;
                    },
                    UseJitter = true
                })
                .Build();

            List<long> dataResponse = [];
            for (int i = 1; i <= request.CampaignCount; i++)
            {
                string listDescription = string.Format(request.ListDescriptionFormat, i);
                string listName = string.Format(request.ListNameFormat, i);
                var staticListRequest = new StaticListRequest(listDescription, listName);
                context.Properties.Set(listKey, staticListRequest);

                var staticListResponse = await pipeline.ExecuteAsync(async context =>
                  {
                      return await _iterableService.CreateStaticList(staticListRequest, token);
                  },
                  context);

                if (staticListResponse != null)
                {
                    await Task.Delay(5000, cancellationToken);
                    _logger.LogInformation("CreateBlast - CreateStaticList {0}", staticListResponse.ListId);
                    dataResponse.Add(staticListResponse.ListId);
                }
            }
            return dataResponse;
        }

        private async Task<List<BlastListSubscriberResponse>> CreateBlastListSubscribers(BlastListSubscriberRequest request, string token, CancellationToken cancellationToken)
        {
            ResilienceContext context = ResilienceContextPool.Shared.Get(cancellationToken);
            var subscriberListKey = new ResiliencePropertyKey<SubscriberListRequest>("subscriberlist-key");

            var pipeline = new ResiliencePipelineBuilder<SubscriberListResponse?>()
                .AddFallback(new FallbackStrategyOptions<SubscriberListResponse?>
                {
                    ShouldHandle = new PredicateBuilder<SubscriberListResponse?>()
                    .Handle<Exception>()
                    .HandleResult(r => r is null),
                    FallbackAction = args =>
                    {
                        return Outcome.FromResultAsValueTask<SubscriberListResponse?>(null);
                    },
                    OnFallback = args =>
                    {
                        // Add extra logic to be executed when the fallback is triggered, such as logging.
                        _logger.LogInformation("CreateBlastListSubscribers Fallback");
                        return default; // Returns an empty ValueTask
                    }
                })
                .AddRetry(new RetryStrategyOptions<SubscriberListResponse?>
                {
                    Delay = TimeSpan.FromSeconds(15),
                    MaxRetryAttempts = 2,
                    BackoffType = DelayBackoffType.Linear,
                    OnRetry = args =>
                    {
                        _logger.LogInformation("CreateBlastListSubscribers {@retry}", args.AttemptNumber);
                        _logger.LogError(args.Outcome.Exception, "CreateBlastListSubscribers an error ocurred {@request}", request);
                        return default;
                    },
                    UseJitter = true
                })
                .Build();

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
                    context.Properties.Set(subscriberListKey, subscriberListRequest);

                    var subscriberListResponse = await pipeline.ExecuteAsync(async context =>
                    {
                        return await _iterableService.CreateSubscriberList(subscriberListRequest, token);
                    },
                    context);

                    if (subscriberListResponse != null)
                    {
                        await Task.Delay(5000, cancellationToken);
                        _logger.LogInformation("CreateBlast - CreateSubscriberList {0}", subscriberListResponse.SuccessCount);
                        dataResponse.Add(new BlastListSubscriberResponse(listId, emailChunk.ElementAt(i)));
                    }
                }
            }
            return dataResponse;
        }

        private async Task<List<BlastCampaignResponse>> CreateBlastCampaign(BlastCampaignRequest request, string token, CancellationToken cancellationToken)
        {
            ResilienceContext context = ResilienceContextPool.Shared.Get(cancellationToken);
            var campaignKey = new ResiliencePropertyKey<CreateCampaignRequest>("campaign-key");

            var pipeline = new ResiliencePipelineBuilder<CreateCampaginResponse?>()
                .AddFallback(new FallbackStrategyOptions<CreateCampaginResponse?>
                {
                    ShouldHandle = new PredicateBuilder<CreateCampaginResponse?>()
                    .Handle<Exception>()
                    .HandleResult(r => r is null),
                    FallbackAction = args =>
                    {
                        return Outcome.FromResultAsValueTask<CreateCampaginResponse?>(null);
                    },
                    OnFallback = args =>
                    {
                        // Add extra logic to be executed when the fallback is triggered, such as logging.
                        _logger.LogInformation("CreateBlastCampaign Fallback");
                        return default; // Returns an empty ValueTask
                    }
                })
                .AddRetry(new RetryStrategyOptions<CreateCampaginResponse?>
                {
                    Delay = TimeSpan.FromSeconds(15),
                    MaxRetryAttempts = 2,
                    BackoffType = DelayBackoffType.Linear,
                    OnRetry = args =>
                    {
                        _logger.LogInformation("CreateBlastCampaign {@retry}", args.AttemptNumber);
                        _logger.LogError(args.Outcome.Exception, "CreateBlastCampaign an error ocurred {@request}", request);
                        return default;
                    },
                    UseJitter = true
                })
                .Build();

            List<BlastCampaignResponse> dataResponse = [];
            List<long>? suppresionLists = request.SupressionList != null ? [request.SupressionList.Value] : null;

            for (int i = 0; i < request.ListIds.Count(); i++)
            {
                var listId = request.ListIds.ElementAt(i);

                var sendScheduleDate = request.SendAt.AddMinutes(request.IntervalTime * i);
                string sendDate = sendScheduleDate.ToString("yyyy-MM-dd HH:mm:ss");
                var createCampaignRequest = new CreateCampaignRequest([listId], request.CampaignName, sendDate, request.TemplateId, suppresionLists);
                context.Properties.Set(campaignKey, createCampaignRequest);

                var createCampaignResponse = await pipeline.ExecuteAsync(async context =>
                {
                    return await _iterableService.CreateCampagin(createCampaignRequest, token);
                },
                context);                

                if (createCampaignResponse != null)
                {
                    await Task.Delay(5000, cancellationToken);
                    _logger.LogInformation("CreateBlast - CreateCampagin {0}", createCampaignResponse.CampaignId);
                    dataResponse.Add(new BlastCampaignResponse(createCampaignResponse.CampaignId, sendDate));
                }
            }

            return dataResponse;
        }
    }
}
