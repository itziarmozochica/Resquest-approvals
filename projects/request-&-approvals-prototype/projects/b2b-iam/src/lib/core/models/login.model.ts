import type { LoginNextStep } from './login-next-step.enum';

/** Raw (snake_case) login envelope as returned by the b2b-iam auth API. */
export interface LoginApi {
  token: string | null;
  user_id: number;
  enrollment_id?: string;
  next_step?: LoginNextStep;
}

/** Domain (camelCase) login result consumed by b2b-iam clients. */
export interface Login {
  token: string | null;
  userId: number;
  enrollmentId?: string;
  /** What the client must do next (MFA, etc.); absent when login is complete. */
  nextStep?: LoginNextStep;
}
