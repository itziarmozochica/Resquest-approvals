import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface DepositModifyWarningShownData extends DepositTrackingContext {
  cartId: string;
  modifyAction: string;
  reservationId: string;
}

export const depositModifyWarningShown = defineEvent<DepositModifyWarningShownData>('reservation.deposit.modifyWarningShown');
