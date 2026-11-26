import type { AgreementSigningState } from '../models/store/agreement-signing-store.model';

type LoadSlice = Pick<AgreementSigningState, 'error' | 'isLoading'>;
type SignSlice = Pick<AgreementSigningState, 'isSigning' | 'signError'>;

export function setPending(): LoadSlice {
  return { error: null, isLoading: true };
}

export function setError(error: unknown): LoadSlice {
  return { error, isLoading: false };
}

export function setSuccess(): LoadSlice {
  return { error: null, isLoading: false };
}

export function setSignPending(): SignSlice {
  return { isSigning: true, signError: null };
}

export function setSignError(signError: unknown): SignSlice {
  return { isSigning: false, signError };
}

export function setSignSuccess(): SignSlice {
  return { isSigning: false, signError: null };
}
