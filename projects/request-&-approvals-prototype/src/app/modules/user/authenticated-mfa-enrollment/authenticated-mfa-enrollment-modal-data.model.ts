/** Callback runs when verify succeeds so MFA status can refresh while recovery codes are still shown. */
export interface AuthenticatedMfaEnrollmentModalData {
  readonly onEnrolled: () => void;
}
