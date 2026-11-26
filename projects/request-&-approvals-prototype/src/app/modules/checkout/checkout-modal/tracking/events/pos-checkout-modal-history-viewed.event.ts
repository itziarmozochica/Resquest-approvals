import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalHistoryViewedData {
  checkoutSessionId: string;
  legsCompleted: number;
  paidAmount: number;
}

export const posCheckoutModalHistoryViewed = defineEvent<PosCheckoutModalHistoryViewedData>('pos.checkout.modal.history.viewed');
