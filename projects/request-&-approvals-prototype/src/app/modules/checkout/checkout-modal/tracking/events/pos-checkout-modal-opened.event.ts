import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalOpenedData {
  availableMethods: string[];
  cartTotal: number;
  checkoutSessionId: string;
  currency: string;
  itemCount: number;
}

export const posCheckoutModalOpened = defineEvent<PosCheckoutModalOpenedData>('pos.checkout.modal.opened');
