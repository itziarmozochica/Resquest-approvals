/** Raw (snake_case) MFA-recovery envelope as returned by the b2b-iam auth API. */
export interface MfaRecoveryApi {
  token: string;
  user_id: number;
}

/** Domain (camelCase) MFA-recovery result consumed by b2b-iam clients. */
export interface MfaRecovery {
  token: string;
  userId: number;
}
