export const MfaEnrollmentStep = {
  initiate: 'initiate',
  qrDisplay: 'qrDisplay',
  recoveryCodes: 'recoveryCodes',
} as const;

export type MfaEnrollmentStepET = (typeof MfaEnrollmentStep)[keyof typeof MfaEnrollmentStep];
