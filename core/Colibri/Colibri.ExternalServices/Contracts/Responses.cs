using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Colibri.ExternalServices.Contracts
{
    public record StaticListResponse(
      [property: JsonProperty("listId")] long ListId
    );

    public record SubscriberListResponse
    (
        [property: JsonProperty("createdFields")]
             List<string> CreatedFields,

        [property: JsonProperty("failCount")]
             long FailCount,

        [property: JsonProperty("failedUpdates")]
             FailedUpdatesDto FailedUpdates,

        [property: JsonProperty("filteredOutFields")]
             List<string> FilteredOutFields,

        [property: JsonProperty("invalidEmails")]
             List<string> InvalidEmails,

        [property: JsonProperty("invalidUserIds")]
             List<string> InvalidUserIds,

        [property: JsonProperty("successCount")]
             long SuccessCount
    );

    public record DeleteListResponse
    (
       [property: JsonProperty("code")]
         string Code,

       [property: JsonProperty("msg")]
         string Msg,

       [property: JsonProperty("params")]
         Dictionary<string, object> Params
    );

    public record CreateCampaginResponse
    (
        [property: JsonProperty("campaignId")]
            long CampaignId
    );

    public record ScheduleCampaignResponse
    (
       [property: JsonProperty("code")]
             string Code,

       [property: JsonProperty("msg")]
             string Msg,

       [property: JsonProperty("params")]
             Dictionary<string, object> Params
    );

    public record CampaignResponse
    (
        [property: JsonProperty("campaigns")]
         List<ProjectCampaignDto> Campaigns
    );

    public record ProjectTemplateResponse
    (
        [property: JsonProperty("templates")]
        List<ProjectTemplateDto> Templates
    );

    public record CampaignListResponse(
        [property: JsonProperty("lists")] IReadOnlyList<ProjectCampaignListDto> Lists
    );

    public record BlastListSubscriberResponse(
        [property: JsonProperty("listId")] long ListId,
        [property: JsonProperty("emails")] string[] Emails
    );

    public record BlastCampaignResponse(
        [property: JsonProperty("campaignId")] long CampaignId,
        [property: JsonProperty("sendAt")] string SendAt
    );
}
