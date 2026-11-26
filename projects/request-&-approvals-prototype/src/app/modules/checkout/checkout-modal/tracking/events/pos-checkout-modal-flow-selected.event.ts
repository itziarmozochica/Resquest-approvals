import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalFlowSelectedData {
  checkoutSessionId: string;
  flowType: string;
  fromFlowType: string | null;
}

export const posCheckoutModalFlowSelected = defineEvent<PosCheckoutModalFlowSelectedData>('pos.checkout.modal.flow.selected');
