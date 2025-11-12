export interface CampaignResponse {
  campaignState: string;
  createdAt: number;
  createdByUserId: string;
  endedAt: number;
  id: bigint;
  labels: string[];
  listIds: bigint[];
  messageMedium: string;
  name: string;
  recurringCampaignId: bigint;
  sendSize: number;
  startAt: number;
  suppressionListIds: number[];
  templateId: bigint;
  type: string;
  updatedAt: number;
  updatedByUserId: bigint;
  workflowId: bigint;
}

export interface CreateCampaignResponse {
  campaignId: bigint;
}
