export interface MfaVerificationData {
  recovery_codes?: string[] | null;
  token: string;
  user_id: number;
}

export interface MfaVerification {
  recoveryCodes?: string[] | null;
  token: string;
  userId: number;
}
