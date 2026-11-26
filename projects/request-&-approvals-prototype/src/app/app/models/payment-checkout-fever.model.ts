export interface FeverCheckoutBody {
  channel_id: string;
  payment_method_type: string;
  reservation_id: string;
  user_id: number;
}

export type CreateFeverCheckoutData = void;
