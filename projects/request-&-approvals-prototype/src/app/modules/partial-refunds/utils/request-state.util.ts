import type { RequestState } from '../models/request-state.model';

export function requestFailed<T>(error: unknown): RequestState<T> {
  return { data: null, error, isLoading: false };
}

export function requestIdle<T>(): RequestState<T> {
  return { data: null, error: null, isLoading: false };
}

/** Keeps the previous data so a re-request does not blank the screen while it is in flight. */
export function requestLoading<T>(current: RequestState<T>): RequestState<T> {
  return { data: current.data, error: null, isLoading: true };
}

export function requestSucceeded<T>(data: T): RequestState<T> {
  return { data, error: null, isLoading: false };
}
