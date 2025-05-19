import { CampaignCreate } from '../campaignCreate.model';

export interface BlastRequest {
  batchSize: number;
  intervalTime: number;
  listNameFormat: string;
  listDescriptionFormat: string;
  sourceListId: number;
  sendAt: string;
  sourceTemplateId: number;
  sourceSupressionList: number | null | undefined;
  campaign: CampaignCreate;
}
