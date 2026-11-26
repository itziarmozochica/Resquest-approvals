export const loginNextStep = {
  mfaEnrollment: 'mfa_enrollment',
  mfaVerification: 'mfa_verification',
  loginSuccess: 'login_success',
} as const;

export type LoginNextStepET = (typeof loginNextStep)[keyof typeof loginNextStep];
