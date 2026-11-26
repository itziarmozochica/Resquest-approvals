import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalStepTransitionedData {
  cancelFailureReason: string | null;
  checkoutSessionId: string;
  currentSplitIndex: number;
  elapsedMs: number;
  flowType: string | null;
  fromStepId: string | null;
  hadRecordedPayments: boolean;
  history: string[];
  historyDepth: number;
  intent: string | null;
  legAmount: number | null;
  navigationKind: 'enter' | 'transition' | 'back' | 'close';
  paidAmount: number;
  paymentFailureReason: string | null;
  paymentStarted: boolean;
  payRemaining: boolean;
  remainingAmount: number;
  resendRequested: boolean;
  selectedItemCount: number;
  selectedMethod: string | null;
  sequence: number;
  splitCount: number;
  toStepId: string | null;
  transactionsCount: number;
}

export const posCheckoutModalStepTransitioned = defineEvent<PosCheckoutModalStepTransitionedData>('pos.checkout.modal.step.transitioned');
