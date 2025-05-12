export interface CreateCampaignRequest {
  dataFields?: any | null;
  defaultTimeZone: string;
  listIds: number[];
  name: string;
  sendAt: string;
  sendMode: string;
  startTimeZone: string;
  suppressionListIds?: number[] | null;
  templateId: number;
}
