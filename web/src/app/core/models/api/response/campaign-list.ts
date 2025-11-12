export interface CampaignListResponse {
  id: bigint;
  name: string;
  description: string | null;
  createdAt: number;
  listType: string;
}
