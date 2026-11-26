export interface TagTypeApiResponse {
  readonly id: number;
  readonly name: string;
  readonly sort_order: number;
}

// Create and rename take the name alone; `sort_order` is the backend's and is not settable here.
export interface TagTypeRequest {
  readonly name: string;
}

export interface TagTypeOrderRequest {
  readonly tag_type_ids: readonly number[];
}
