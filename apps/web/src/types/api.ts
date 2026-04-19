export interface ApiListResponse<T> {
  items: T[];
  total: number;
}

export interface ApiMessageResponse {
  message: string;
}
