import { HttpErrorResponse } from '@angular/common/http';

export interface MfaErrorHandlerResult {
  errorMessage: string | null;
  loginQueryParams?: { mfaBlocked?: string; mfaEnrollBlocked?: string };
  shouldNavigateToLogin: boolean;
}

export function handleMfaEnrollVerificationError(error: HttpErrorResponse | unknown): MfaErrorHandlerResult {
  const httpError = error as { code?: number | string; error?: { status?: number }; status?: number } | null;
  const statusCode = httpError?.status ?? httpError?.error?.status ?? (typeof httpError?.code === 'number' ? httpError?.code : undefined);

  if (statusCode === 429) {
    return {
      errorMessage: null,
      loginQueryParams: { mfaEnrollBlocked: 'true' },
      shouldNavigateToLogin: true,
    };
  }

  if (statusCode === 401) {
    return {
      errorMessage: 'mfa.verification.error.invalidCode',
      shouldNavigateToLogin: false,
    };
  }

  return {
    errorMessage: 'mfa.verification.error.generic',
    shouldNavigateToLogin: false,
  };
}

export function handleAuthenticatedMfaEnrollVerificationError(error: HttpErrorResponse | unknown): MfaErrorHandlerResult {
  const httpError = error as { code?: number | string; error?: { status?: number }; status?: number } | null;
  const statusCode = httpError?.status ?? httpError?.error?.status ?? (typeof httpError?.code === 'number' ? httpError?.code : undefined);

  if (statusCode === 429) {
    return {
      errorMessage: 'mfa.enrollment.error.tooManyAttempts',
      shouldNavigateToLogin: false,
    };
  }

  if (statusCode === 401) {
    return {
      errorMessage: 'mfa.verification.error.invalidCode',
      shouldNavigateToLogin: false,
    };
  }

  return {
    errorMessage: 'mfa.verification.error.generic',
    shouldNavigateToLogin: false,
  };
}

export function handleMfaVerificationError(error: HttpErrorResponse | unknown): MfaErrorHandlerResult {
  const httpError = error as { code?: number | string; error?: { status?: number }; status?: number } | null;
  const statusCode = httpError?.status ?? httpError?.error?.status ?? (typeof httpError?.code === 'number' ? httpError?.code : undefined);

  if (statusCode === 429) {
    return {
      errorMessage: null,
      loginQueryParams: { mfaBlocked: 'true' },
      shouldNavigateToLogin: true,
    };
  }

  if (statusCode === 401) {
    return {
      errorMessage: 'mfa.verification.error.invalidCode',
      shouldNavigateToLogin: false,
    };
  }

  return {
    errorMessage: 'mfa.verification.error.generic',
    shouldNavigateToLogin: false,
  };
}

export function handleMfaRecoveryError(error: HttpErrorResponse | unknown): MfaErrorHandlerResult {
  const httpError = error as { code?: number | string; error?: { status?: number }; status?: number } | null;
  const statusCode = httpError?.status ?? httpError?.error?.status ?? (typeof httpError?.code === 'number' ? httpError?.code : undefined);

  if (statusCode === 429) {
    return {
      errorMessage: null,
      shouldNavigateToLogin: true,
      loginQueryParams: { mfaBlocked: 'true' },
    };
  }

  if (statusCode === 401) {
    return {
      errorMessage: 'mfa.recovery.error.invalidCode',
      shouldNavigateToLogin: false,
    };
  }

  return {
    errorMessage: 'mfa.recovery.error.generic',
    shouldNavigateToLogin: false,
  };
}
