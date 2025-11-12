export interface TemplateResponse {
  campaignId: bigint;
  clientTemplateId: string;
  createdAt: string;
  creatorUserId: string;
  messageTypeId: bigint;
  name: string;
  templateId: bigint;
  updatedAt: string;
}

export interface TemplatesResponse {
  templates: TemplateResponse[];
}

export interface TemplateDetailResponse {
  bccEmails: string[];
  cacheDataFeed: CacheDataFeed;
  ccEmails: string[];
  clientTemplateId: string;
  creatorUserId: string;
  dataFeedId: number;
  dataFeedIds: number[];
  fromEmail: string;
  fromName: string;
  googleAnalyticsCampaignName: string;
  html: string;
  isDefaultLocale: boolean;
  linkParams: LinkParam[];
  locale: string;
  mergeDataFeedContext: MergeDataFeedContext;
  messageTypeId: number;
  metadata: Metadata;
  name: string;
  plainText: string;
  preheaderText: string;
  replyToEmail: string;
  subject: string;
  templateId: number;
}

export interface CacheDataFeed {}

export interface LinkParam {
  key: string;
  value: string;
}

export interface MergeDataFeedContext {}

export interface Metadata {
  campaignId: bigint;
  clientTemplateId: string;
  createdAt: string;
  creatorUserId: string;
  messageTypeId: bigint;
  name: string;
  templateId: bigint;
  updatedAt: string;
}
