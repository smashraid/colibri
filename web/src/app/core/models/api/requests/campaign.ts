export interface CreateCampaignRequest {
  listIds: bigint[];
  name: string;
  sendAt: string;
  templateId: bigint;
  suppressionListIds?: bigint[] | null;
  sendMode?: string;
  startTimeZone?: string;
  defaultTimeZone?: string;
  dataFields?: { [key: string]: any } | null;
}

export interface ArchiveCampaignRequest {
  campaignIds: bigint[];
}
