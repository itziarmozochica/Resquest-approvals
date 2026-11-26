export enum AmbassadorRegisterStatus {
  INITIATED = 'INITIATED',
  USER_CONFIRMED = 'USER_CONFIRMED',
}

export interface AmbassadorRegisterForm {
  fullName: string;
  email: string;
}

export interface AmbassadorRegisterFormResponse {
  ambassador_registration_pm_id: string;
  status: AmbassadorRegisterStatus;
}
