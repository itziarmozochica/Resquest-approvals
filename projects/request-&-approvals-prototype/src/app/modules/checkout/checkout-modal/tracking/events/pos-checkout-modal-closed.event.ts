import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalClosedData {
  checkoutSessionId: string;
  durationMs: number;
  flowType: string | null;
  hadRecordedPayments: boolean;
  history: string[];
  lastStepId: string | null;
  legsCompleted: number;
  outcome: 'completed' | 'abandoned' | 'payment_link_sent' | 'session_cancelled';
  paidAmount: number;
  remainingAmount: number;
  stepCount: number;
}

export const posCheckoutModalClosed = defineEvent<PosCheckoutModalClosedData>('pos.checkout.modal.closed');
