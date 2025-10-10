export interface ApiResponse<T> {
  code: number;
  status: boolean;
  message: string;
  data: T;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface ApiResponseOptions {
  code?: number;
  status?: boolean;
  message?: string;
  pagination?: PaginationMeta;
}