import { FreeUnifyCheckoutBody } from '@fz-original/app/app/models/payment-checkout-free.model';

export interface DelegatedUnifyCheckoutBody extends FreeUnifyCheckoutBody {
  transaction_id?: string;
  payment_method_type: string;
  cash_received?: number;
  cash_leg_amount?: number;
  split_leg_index?: number;
  split_payment_flag?: boolean;
  device_id?: string;
}
