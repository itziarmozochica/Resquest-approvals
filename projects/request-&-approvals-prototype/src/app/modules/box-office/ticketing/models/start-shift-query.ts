export interface B2BUserDTO {
  b2b_user_email: string;
  b2b_user_name: string;
  b2b_user_username: string;
}

export interface B2BUser {
  b2bUserEmail?: string;
  b2bUserName?: string;
  b2bUserUsername?: string;
}

export interface StartShiftQueryDTO {
  b2b_user: B2BUserDTO;
  cash_register_id: string;
  city_id: number;
  currency: string;
  initial_amount?: number;
  onsite_setup_id?: string;
}

export interface StartShiftQuery {
  b2bUser: B2BUser;
  cashRegisterId: string;
  cityId: number;
  currency: string;
  initialAmount?: number;
  onsiteSetupId?: string;
}

export const maxShiftCashAmount = 99999999.99;
