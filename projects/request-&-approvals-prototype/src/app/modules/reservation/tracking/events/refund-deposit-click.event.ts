import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface RefundDepositClickData {
  currency: string;
  depositId: string;
  paymentMethod: string;
  refundedAmount: number;
  reservationId: string;
}

export const refundDepositClick = defineEvent<RefundDepositClickData>('refund.deposit');
