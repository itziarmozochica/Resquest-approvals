import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface DepositRefundFailedData {
  currency: string;
  depositId: string;
  errorCode: string | number | null;
  paymentMethod: string;
  refundedAmount: number;
  reservationId: string;
}

export const depositRefundFailed = defineEvent<DepositRefundFailedData>('reservation.deposit.refundFailed');
