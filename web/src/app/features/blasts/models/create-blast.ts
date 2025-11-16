export interface CreateBlastRequest {
  projectId: number;
  name: string;
  tags: string[] | null;
  batchSize: number | null;
  initialListSize: number | null;
  growthPercentage: number | null;
  batchType: number;
  intervalTime: number | null;
  listNameFormat: string;
  listDescriptionFormat: string;
  iterableListId: bigint;
  iterableTemplateId: bigint;
  iterableSupressionId: bigint | null;
  sendAt: string;
  status: number;
  createdBy: string;
  createdDate: string;
}
