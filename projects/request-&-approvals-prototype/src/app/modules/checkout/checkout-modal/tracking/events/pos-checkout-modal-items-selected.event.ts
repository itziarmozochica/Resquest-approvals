import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalItemsSelectedData {
  checkoutSessionId: string;
  payRemaining: boolean;
  selectedAmount: number;
  selectedItemCount: number;
}

export const posCheckoutModalItemsSelected = defineEvent<PosCheckoutModalItemsSelectedData>('pos.checkout.modal.items.selected');
