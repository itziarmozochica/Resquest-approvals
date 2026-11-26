import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalMethodSelectedData {
  availableMethods: string[];
  checkoutSessionId: string;
  flowType: string | null;
  legIndex: number;
  paymentMethod: string;
}

export const posCheckoutModalMethodSelected = defineEvent<PosCheckoutModalMethodSelectedData>('pos.checkout.modal.method.selected');
