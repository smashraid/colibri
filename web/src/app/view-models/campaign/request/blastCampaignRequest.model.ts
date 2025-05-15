export interface BlastCampaignRequest {
    listIds: number[];
    campaignName: string;
    templateId: number;
    sendAt: string;
    supressionList: number | null
}