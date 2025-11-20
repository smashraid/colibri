export interface PagedMetadata {
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  pageSizeOptions: number[];
}

export interface PagedQuery {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection: 'asc' | 'desc';
}

export interface BlastPagedQuery extends PagedQuery {
  name?: string;
  projectId: number;
}
