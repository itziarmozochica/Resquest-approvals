export interface Promotion {
  description?: string | null;
  id: number;
  name: string;
  required?: boolean;
  validation_method: {
    name: string;
    type: PromotionValidationType;
  };
}

export type PromotionValidationType = 'user_password' | 'promotional_code' | 'gift_ticket' | 'user' | 'loyalty_card';

export interface PromotionResponse {
  code?: string;
  password?: string;
  promotion_id: number;
  username?: string;
}

export interface PromotionValidate {
  message: string;
  promotion_id?: number;
  valid: boolean;
}

export interface PromotionsResult {
  coupon?: string;
  promotions: Promotion[];
}

export interface PromotionAppliedResponse {
  coupon: string;
  errors: [];
}
