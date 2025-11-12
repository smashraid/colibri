export interface CreateBlastRequest {
  projectId: number;
  name: string;
  tags: string[] | null;
  batchSize: number | null;
  initialListSize: number | null;
  growthPercentage: number | null;
  batchType: number;
  intervalTime: number;
  listNameFormat: string;
  listDescriptionFormat: string;
  iterableListId: number;
  iterableTemplateId: number;
  iterableSupressionId: number | null;
  sendAt: string;
  status: number;
  createdBy: string;
  createdDate: string;
}
