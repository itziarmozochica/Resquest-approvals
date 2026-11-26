import { LoginNextStepET } from './login-next-step.enum';

export interface LoginData {
  enrollment_id?: string;
  next_step?: LoginNextStepET;
  token: string | null;
  user_id: number;
}

export interface Login {
  enrollmentId?: string;
  nextStep?: LoginNextStepET;
  token: string | null;
  userId: number;
}
