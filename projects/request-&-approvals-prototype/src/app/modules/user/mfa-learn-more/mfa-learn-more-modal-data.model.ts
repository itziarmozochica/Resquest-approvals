/** Dialog payload for the MFA learn-more informational modal. */
export interface MfaLearnMoreModalData {
  readonly enforcedAt: string | null;
  /** True when the MFA grace period has ended (`policy.status === required`). */
  readonly isGraceExpired: boolean;
  readonly orgName: string | null;
}

/** Distinguishes dismiss (X / Remind me later) from Set up 2FA handoff. */
export enum MfaLearnMoreModalResult {
  Dismiss = 'dismiss',
  Setup = 'setup',
}
