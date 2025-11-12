export interface CreateStaticListResponse {
  listId: bigint;
}

export interface DeleteStaticListResponse {
  code: string;
  msg: string;
  params: Record<string, any>;
}
