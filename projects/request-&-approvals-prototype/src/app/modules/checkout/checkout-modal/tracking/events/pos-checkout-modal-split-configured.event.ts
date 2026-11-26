import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalSplitConfiguredData {
  cartTotal: number;
  checkoutSessionId: string;
  splitCount: number;
}

export const posCheckoutModalSplitConfigured = defineEvent<PosCheckoutModalSplitConfiguredData>('pos.checkout.modal.split.configured');
