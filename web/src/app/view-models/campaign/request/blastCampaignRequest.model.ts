export interface BlastCampaignRequest {
    listIds: number[];
    campaignName: string;
    templateId: number;
    intervalTime: number;
    sendAt: string;
    supressionList: number | null
}