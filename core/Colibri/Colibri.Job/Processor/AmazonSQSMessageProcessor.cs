using Amazon.SQS;
using Azure.Core;
using Colibri.ExternalServices;
using Colibri.ExternalServices.Contracts;
using Colibri.Job.Models;
using Microsoft.Extensions.Logging;
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

                    await Task.Delay(8000, cancellationToken);

                    var blastCampaignRequest = new BlastCampaignRequest(listIds, blastRequest.Campaign.Name, blastRequest.SourceTemplateId, Convert.ToDateTime(blastRequest.SendAt), blastRequest.IntervalTime, blastRequest.SourceSupressionList);

                    var blastCampaignResponse = await CreateBlastCampaign(blastCampaignRequest, project.ApiKey, cancellationToken);

                    await Task.Delay(8000, cancellationToken);

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
                        await Task.Delay(2000, cancellationToken);
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
            List<long> dataResponse = [];
            for (int i = 1; i <= request.CampaignCount; i++)
            {
                string listDescription = string.Format(request.ListDescriptionFormat, i);
                string listName = string.Format(request.ListNameFormat, i);
                var staticListResponse = await _iterableService.CreateStaticList(new StaticListRequest(listDescription, listName), token);

                if (staticListResponse != null)
                {
                    await Task.Delay(2000, cancellationToken);
                    _logger.LogInformation("CreateBlast - CreateStaticList {0}", staticListResponse.ListId);
                    dataResponse.Add(staticListResponse.ListId);
                }
            }
            return dataResponse;
        }

        private async Task<List<BlastListSubscriberResponse>> CreateBlastListSubscribers(BlastListSubscriberRequest request, string token, CancellationToken cancellationToken)
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

                    var subscriberListResponse = await _iterableService.CreateSubscriberList(new SubscriberListRequest(listId, chunk, true), token);

                    if (subscriberListResponse != null)
                    {
                        await Task.Delay(2000, cancellationToken);
                        _logger.LogInformation("CreateBlast - CreateSubscriberList {0}", subscriberListResponse.SuccessCount);
                        dataResponse.Add(new BlastListSubscriberResponse(listId, emailChunk.ElementAt(i)));
                    }
                }
            }
            return dataResponse;
        }

        private async Task<List<BlastCampaignResponse>> CreateBlastCampaign(BlastCampaignRequest request, string token, CancellationToken cancellationToken)
        {
            List<BlastCampaignResponse> dataResponse = [];
            List<long>? suppresionLists = request.SupressionList != null ? [request.SupressionList.Value] : null;

            for (int i = 0; i < request.ListIds.Count(); i++)
            {
                var listId = request.ListIds.ElementAt(i);

                var sendScheduleDate = request.SendAt.AddMinutes(request.IntervalTime * i);
                string sendDate = sendScheduleDate.ToString("yyyy-MM-dd HH:mm:ss");

                var createCampaignResponse = await _iterableService.CreateCampagin(new CreateCampaignRequest([listId], request.CampaignName, sendDate, request.TemplateId, suppresionLists), token);

                if (createCampaignResponse != null)
                {
                    await Task.Delay(2000, cancellationToken);
                    _logger.LogInformation("CreateBlast - CreateCampagin {0}", createCampaignResponse.CampaignId);
                    dataResponse.Add(new BlastCampaignResponse(createCampaignResponse.CampaignId, sendDate));
                }
            }

            return dataResponse;
        }
    }
}
