import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { DepositTrackingContext } from '../models/deposit-tracking-context.model';

export interface CancelReservationData extends DepositTrackingContext {
  businessType?: string;
  channel: string;
  placeId: number;
  placeName: string;
  planId: number;
  planName: string;
  reservationId: string;
}

export const cancelReservation = defineEvent<CancelReservationData>('cancel.reservation');
