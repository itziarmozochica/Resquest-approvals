import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalFlowChangedData {
  checkoutSessionId: string;
  fromFlowType: string | null;
  legsCompleted: number;
  paymentStarted: boolean;
  toStep: string | null;
}

export const posCheckoutModalFlowChanged = defineEvent<PosCheckoutModalFlowChangedData>('pos.checkout.modal.flow.changed');
