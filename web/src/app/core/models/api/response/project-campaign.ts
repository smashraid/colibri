export interface ProjectCampaign {
  campaignState: string;
  createdAt: number;
  createdByUserId: string;
  endedAt: number;
  id: number;
  labels: string[];
  listIds: number[];
  messageMedium: string;
  name: string;
  recurringCampaignId: number;
  sendSize: number;
  startAt: number;
  suppressionListIds: number[];
  templateId: number;
  type: string;
  updatedAt: number;
  updatedByUserId: string;
  workflowId: number;
}
