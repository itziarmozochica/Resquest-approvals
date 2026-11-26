import { CheckoutStageEnum } from './checkout-stage.enum';

export interface CheckoutLogContext {
  stage: CheckoutStageEnum;
  cartId?: string;
  data?: Record<string, unknown> | null;
}
