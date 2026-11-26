export interface RequestState<T> {
  readonly data: T | null;
  readonly error: unknown;
  readonly isLoading: boolean;
}
