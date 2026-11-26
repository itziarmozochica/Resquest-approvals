import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface DepositSkippedData extends DepositTrackingContext {
  cartId: string;
  errorCode: string | number | null;
  reservationId: string;
  result: 'error' | 'success';
}

export const depositSkipped = defineEvent<DepositSkippedData>('reservation.deposit.skipped');
