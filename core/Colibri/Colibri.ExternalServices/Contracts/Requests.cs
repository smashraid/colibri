using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Colibri.Shared.ViewModels;
using System.Text.Json.Serialization;
using System.Text.Json;

namespace Colibri.ExternalServices.Contracts
{
    public record StaticListRequest
    (
        [property:JsonProperty("description")]
        string Description,

        [property: JsonProperty("name")]
        string Name
    );

    public record SubscriberListRequest
    (
        [property: JsonProperty("listId")]
        long ListId,

        [property: JsonProperty("subscribers")]
        List<SubscriberDto> Subscribers,

        [property: JsonProperty("updateExistingUsersOnly")]
        bool UpdateExistingUsersOnly
    );

    public record CreateCampaignRequest
    (
       [property: JsonProperty("listIds")]
       List<long> ListIds,

       [property: JsonProperty("name")]
       string Name,

       [property: JsonProperty("sendAt")]
       string SendAt,

       [property: JsonProperty("templateId")]
       long TemplateId,

       [property: JsonProperty("suppressionListIds")]
       List<long>? SuppressionListIds = null,

       [property: JsonProperty("sendMode")]
       string SendMode = "RecipientTimeZone",

       [property: JsonProperty("startTimeZone")]
        string StartTimeZone = "America/New_York",

       [property: JsonProperty("defaultTimeZone")]
       string DefaultTimeZone = "America/New_York",

       [property: JsonProperty("dataFields")]
       Dictionary<string, object>? DataFields = null
    );

    public record ScheduleCampaignRequest
    (
        [property:JsonProperty("recipientTimeZone")]
        RecipientTimeZoneDto RecipientTimeZone,

        [property:JsonProperty("sendAt")]
        DateTime SendAt
    );

    public record ArchiveCampaignRequest
    (
        [property: JsonProperty("campaignIds")]
        List<long> CampaignIds
    );

    public record BlastRequest(
        [property: JsonProperty("campaign")] CampaignCreateViewModel Campaign,
        [property: JsonProperty("batchSize")] int BatchSize,
        [property: JsonProperty("intervalTime")] int IntervalTime,
        [property: JsonProperty("listNameFormat")] string ListNameFormat,
        [property: JsonProperty("listDescriptionFormat")] string ListDescriptionFormat,
        [property: JsonProperty("sourceListId")] long SourceListId,
        [property: JsonProperty("sendAt")] string SendAt,
        [property: JsonProperty("sourceTemplateId")] long SourceTemplateId,
        [property: JsonProperty("sourceSupressionList")] long? SourceSupressionList
    );

    public record BlastListRequest(
        [property: JsonProperty("campaignCount")] int CampaignCount,
        [property: JsonProperty("listNameFormat")] string ListNameFormat,
        [property: JsonProperty("listDescriptionFormat")] string ListDescriptionFormat
    );

    public record BlastListSubscriberRequest(
        [property: JsonProperty("batchSize")] int BatchSize,
        [property: JsonProperty("sourceListId")] long SourceListId,
        [property: JsonProperty("listIds")] IEnumerable<long> ListIds
    );

    public record BlastCampaignRequest(
        [property: JsonProperty("listIds")] IEnumerable<long> ListIds,
        [property: JsonProperty("campaignName")] string CampaignName,
        [property: JsonProperty("templateId")] long TemplateId,
        [property: JsonProperty("sendAt")] DateTime SendAt,
        [property: JsonProperty("intervalTime")] int IntervalTime,
        [property: JsonProperty("supressionList")] long? SupressionList
    );


    public class UserUpdateRequest
    {
        [JsonPropertyName("createNewFields")]
        public bool CreateNewFields { get; set; } = true;

        [JsonPropertyName("dataFields")]
        public Dictionary<string, object>? DataFields { get; init; }

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("mergeNestedObjects")]
        public bool MergeNestedObjects { get; set; } = true;

        [JsonPropertyName("preferUserId")]
        public bool PreferUserId { get; set; } = false;
    }
}
