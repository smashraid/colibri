export interface CampaignCreate {
  id: number;
  projectId: number;
  name: string;
  campaignCount: number;
  tags: string[];
  createdBy: string;
}
