/** Raw (snake_case) MFA-verification envelope as returned by the b2b-iam auth API. */
export interface MfaVerificationApi {
  token: string;
  user_id: number;
  recovery_codes?: string[] | null;
}

/** Domain (camelCase) MFA-verification result consumed by b2b-iam clients. */
export interface MfaVerification {
  token: string;
  userId: number;
  /** One-time recovery codes issued on first verification; null/absent otherwise. */
  recoveryCodes?: string[] | null;
}
