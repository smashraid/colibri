using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Colibri.ExternalServices.Contracts
{
    public record ProjectCampaignDto(
        [property: JsonProperty("campaignState")] string CampaignState,
        [property: JsonProperty("createdAt")] long CreatedAt,
        [property: JsonProperty("createdByUserId")] string CreatedByUserId,
        [property: JsonProperty("endedAt")] long EndedAt,
        [property: JsonProperty("id")] long Id,
        [property: JsonProperty("labels")] IReadOnlyList<string> Labels,
        [property: JsonProperty("listIds")] IReadOnlyList<long> ListIds,
        [property: JsonProperty("messageMedium")] string MessageMedium,
        [property: JsonProperty("name")] string Name,
        [property: JsonProperty("recurringCampaignId")] long RecurringCampaignId,
        [property: JsonProperty("sendSize")] long SendSize,
        [property: JsonProperty("startAt")] long StartAt,
        [property: JsonProperty("suppressionListIds")] IReadOnlyList<long> SuppressionListIds,
        [property: JsonProperty("templateId")] long TemplateId,
        [property: JsonProperty("type")] string Type,
        [property: JsonProperty("updatedAt")] long UpdatedAt,
        [property: JsonProperty("updatedByUserId")] string UpdatedByUserId,
        [property: JsonProperty("workflowId")] long WorkflowId
    );

    public record ProjectCampaignListDto(
      [property: JsonProperty("id")] long Id,
      [property: JsonProperty("name")] string Name,
      [property: JsonProperty("createdAt")] long CreatedAt,
      [property: JsonProperty("listType")] string ListType
    );

    public record SubscriberDto
(
    [property: JsonProperty("email")]
         string Email,

    [property: JsonProperty("dataFields")]
         Dictionary<string, object>? DataFields = null,

    [property: JsonProperty("mergeNestedObjects")]
         bool MergeNestedObjects = true,

    [property: JsonProperty("preferUserId")]
         bool PreferUserId = false,

    [property: JsonProperty("userId")]
         string? UserId = null
);

    public record FailedUpdatesDto
    (
        [property: JsonProperty("conflictEmails")]
        List<string> ConflictEmails,

        [property: JsonProperty("conflictUserIds")]
        List<string> ConflictUserIds,

        [property: JsonProperty("forgottenEmails")]
        List<string> ForgottenEmails,

        [property: JsonProperty("forgottenUserIds")]
        List<string> ForgottenUserIds,

        [property: JsonProperty("invalidDataEmails")]
        List<string> InvalidDataEmails,

        [property: JsonProperty("invalidDataUserIds")]
        List<string> InvalidDataUserIds,

        [property: JsonProperty("invalidEmails")]
        List<string> InvalidEmails,

        [property: JsonProperty("invalidUserIds")]
        List<string> InvalidUserIds,

        [property: JsonProperty("notFoundEmails")]
        List<string> NotFoundEmails,

        [property: JsonProperty("notFoundUserIds")]
        List<string> NotFoundUserIds
    );

    public record RecipientTimeZoneDto
    (
        [property:JsonProperty("defaultTimeZone")]
        string DefaultTimeZone,

        [property:JsonProperty("startTimeZone")]
        string StartTimeZone
    );

    public record ProjectTemplateDto
    (
        [property: JsonProperty("campaignId")]
        long CampaignId,

        [property: JsonProperty("clientTemplateId")]
        string ClientTemplateId,

        [property: JsonProperty("createdAt")]
        DateTime CreatedAt,

        [property: JsonProperty("creatorUserId")]
        string CreatorUserId,

        [property: JsonProperty("messageTypeId")]
        long MessageTypeId,

        [property: JsonProperty("name")]
        string Name,

        [property: JsonProperty("templateId")]
        long TemplateId,

        [property: JsonProperty("updatedAt")]
        DateTime UpdatedAt
    );

    public record LinkParamDto(
        [property: JsonProperty("key")] string Key,
        [property: JsonProperty("value")] string Value
    );

    public record MetadataDto(
        [property: JsonProperty("campaignId")] long CampaignId,
        [property: JsonProperty("clientTemplateId")] string ClientTemplateId,
        [property: JsonProperty("createdAt")] long CreatedAt,
        [property: JsonProperty("creatorUserId")] string CreatorUserId,
        [property: JsonProperty("messageTypeId")] long MessageTypeId,
        [property: JsonProperty("name")] string Name,
        [property: JsonProperty("templateId")] long TemplateId,
        [property: JsonProperty("updatedAt")] long UpdatedAt
    );

    public record TemplateDto(
        [property: JsonProperty("bccEmails")] IReadOnlyList<string> BccEmails,
        [property: JsonProperty("cacheDataFeed")] object CacheDataFeed,
        [property: JsonProperty("ccEmails")] IReadOnlyList<string> CcEmails,
        [property: JsonProperty("clientTemplateId")] string ClientTemplateId,
        [property: JsonProperty("creatorUserId")] string CreatorUserId,
        [property: JsonProperty("dataFeedId")] long DataFeedId,
        [property: JsonProperty("dataFeedIds")] IReadOnlyList<long> DataFeedIds,
        [property: JsonProperty("fromEmail")] string FromEmail,
        [property: JsonProperty("fromName")] string FromName,
        [property: JsonProperty("googleAnalyticsCampaignName")] string GoogleAnalyticsCampaignName,
        [property: JsonProperty("html")] string Html,
        [property: JsonProperty("isDefaultLocale")] bool IsDefaultLocale,
        [property: JsonProperty("linkParams")] IReadOnlyList<LinkParamDto> LinkParams,
        [property: JsonProperty("locale")] string Locale,
        [property: JsonProperty("mergeDataFeedContext")] object MergeDataFeedContext,
        [property: JsonProperty("messageTypeId")] long MessageTypeId,
        [property: JsonProperty("metadata")] MetadataDto Metadata,
        [property: JsonProperty("name")] string Name,
        [property: JsonProperty("plainText")] string PlainText,
        [property: JsonProperty("preheaderText")] string PreheaderText,
        [property: JsonProperty("replyToEmail")] string ReplyToEmail,
        [property: JsonProperty("subject")] string Subject,
        [property: JsonProperty("templateId")] long TemplateId
    );
}
