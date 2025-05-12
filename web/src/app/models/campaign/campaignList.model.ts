export interface CampaignListDb {
  id: number;
  name: string;
  iterableCampaignId: number;
  iterableListId: number;
  iterableTemplateId: number;
  sendAt: string;
  startTimeZone: string;
  defaultTimeZone: string;
  emails: string[];
  order: number;
}
