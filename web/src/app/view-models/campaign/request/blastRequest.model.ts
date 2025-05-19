export interface BlastRequest {
  id: number;
  campaignCount: number;
  batchSize: number;
  intervalTime: number;
  campaignName: string;
  listNameFormat: string;
  listDescriptionFormat: string;
  sourceListId: number;
  sendAt: string;
  sourceTemplateId: number;
  sourceSupressionList: number | null | undefined;
}
