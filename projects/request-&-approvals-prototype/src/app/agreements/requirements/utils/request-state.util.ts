import type { AgreementRequirementsState } from '../models/store/agreement-requirements-store.model';

type LoadSlice = Pick<AgreementRequirementsState, 'error' | 'isLoading'>;

export function setPending(): LoadSlice {
  return { error: null, isLoading: true };
}

export function setError(error: unknown): LoadSlice {
  return { error, isLoading: false };
}

export function setSuccess(): LoadSlice {
  return { error: null, isLoading: false };
}
