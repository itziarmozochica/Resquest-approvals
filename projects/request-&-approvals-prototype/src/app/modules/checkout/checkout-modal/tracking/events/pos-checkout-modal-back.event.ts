import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalBackData {
  checkoutSessionId: string;
  fromStepId: string | null;
  toStepId: string | null;
}

export const posCheckoutModalBack = defineEvent<PosCheckoutModalBackData>('pos.checkout.modal.back');
