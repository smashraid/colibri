export interface TemplateIterable {
    bccEmails: string[]
    cacheDataFeed: CacheDataFeed
    ccEmails: string[]
    clientTemplateId: string
    creatorUserId: string
    dataFeedId: number
    dataFeedIds: number[]
    fromEmail: string
    fromName: string
    googleAnalyticsCampaignName: string
    html: string
    isDefaultLocale: boolean
    linkParams: LinkParam[]
    locale: string
    mergeDataFeedContext: MergeDataFeedContext
    messageTypeId: number
    metadata: Metadata
    name: string
    plainText: string
    preheaderText: string
    replyToEmail: string
    subject: string
    templateId: number
  }
  
  export interface CacheDataFeed {}
  
  export interface LinkParam {
    key: string
    value: string
  }
  
  export interface MergeDataFeedContext {}
  
  export interface Metadata {
    campaignId: number
    clientTemplateId: string
    createdAt: string
    creatorUserId: string
    messageTypeId: number
    name: string
    templateId: number
    updatedAt: string
  }