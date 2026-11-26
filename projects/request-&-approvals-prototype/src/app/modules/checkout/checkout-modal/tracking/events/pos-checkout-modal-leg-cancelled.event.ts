import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosCheckoutModalLegCancelledData {
  checkoutSessionId: string;
  hadPriorLegs: boolean;
  legIndex: number;
  outcomeAfter: 'method_selection' | 'modal_closed';
}

export const posCheckoutModalLegCancelled = defineEvent<PosCheckoutModalLegCancelledData>('pos.checkout.modal.leg.cancelled');
