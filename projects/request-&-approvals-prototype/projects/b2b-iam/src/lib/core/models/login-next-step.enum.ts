/**
 * The server's decision on what the client must do next after a login attempt,
 * returned in the `next_step` field of the b2b-iam auth API (B2BR-5291 · WI-4).
 *
 * A built-in string enum (per the repo `ts-enums` rule): the members are what
 * consumers branch on, and the string values are the exact wire tokens.
 */
export enum LoginNextStep {
  LoginSuccess = 'login_success',
  MfaEnrollment = 'mfa_enrollment',
  MfaVerification = 'mfa_verification',
}
