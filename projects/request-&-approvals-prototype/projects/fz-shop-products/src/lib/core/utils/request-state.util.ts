import type { RequestState } from '../models/request-state.model';

export function setPending(): RequestState {
  return { error: null, isLoading: true };
}

export function setError(error: unknown): RequestState {
  return { error, isLoading: false };
}

export function setSuccess(): RequestState {
  return { error: null, isLoading: false };
}
