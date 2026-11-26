import { TagTypeApiResponse } from './tag-type-response.model';

export interface TagApiResponse {
  readonly color: string | null;
  readonly icon: string | null;
  readonly id: number;
  readonly name: string;
  readonly product_count: number;
  readonly tag_type: TagTypeApiResponse | null;
}

// A PUT is a full replace and rejects a body missing `color`, `icon` or `tag_type_id`, so all four keys
// go on every write. Unknown keys are rejected too, so nothing else may be added here.
export interface TagRequest {
  readonly color: string | null;
  readonly icon: string | null;
  readonly name: string;
  readonly tag_type_id: number | null;
}

export interface TagAssignmentsRequest {
  readonly tag_ids: number[];
}

// The type rides along on the assignments read too, so no surface needs a second call to group.
export interface AssignedTagApiResponse {
  readonly color: string | null;
  readonly icon: string | null;
  readonly id: number;
  readonly name: string;
  readonly tag_type: TagTypeApiResponse | null;
}

export interface TagAssignmentApiResponse {
  readonly tags: readonly AssignedTagApiResponse[];
  readonly target_id: string;
}
