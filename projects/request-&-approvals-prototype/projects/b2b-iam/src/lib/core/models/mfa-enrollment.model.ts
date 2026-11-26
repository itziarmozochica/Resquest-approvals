/** Raw (snake_case) MFA-enrollment envelope as returned by the b2b-iam auth API. */
export interface MfaEnrollmentApi {
  enrollment_id: string;
  secret: string;
  uri: string;
}

/** Domain (camelCase) MFA-enrollment result consumed by b2b-iam clients. */
export interface MfaEnrollment {
  enrollmentId: string;
  secret: string;
  uri: string;
}
