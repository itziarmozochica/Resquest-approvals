import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface DepositRefundCompletedData {
  currency: string;
  depositId: string;
  paymentMethod: string;
  refundedAmount: number;
  reservationId: string;
}

export const depositRefundCompleted = defineEvent<DepositRefundCompletedData>('reservation.deposit.refundCompleted');
