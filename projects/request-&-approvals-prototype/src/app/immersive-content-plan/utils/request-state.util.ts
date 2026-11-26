import type { ImmersiveContentPlanStoreState } from '../models/store/immersive-content-plan-store.model';

// Feature-local copy of the `agreements/requirements` request-state pattern (no shared
// cross-feature primitive exists yet for this repo).
type LoadSlice = Pick<ImmersiveContentPlanStoreState, 'error' | 'isLoading'>;

export function setPending(): LoadSlice {
  return { error: null, isLoading: true };
}

export function setError(error: unknown): LoadSlice {
  return { error, isLoading: false };
}

export function setSuccess(): LoadSlice {
  return { error: null, isLoading: false };
}
