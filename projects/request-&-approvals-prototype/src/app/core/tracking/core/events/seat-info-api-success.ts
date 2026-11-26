import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SeatInfoApiSuccessData {
  mainPlanId: number;
  orderId?: number;
  partnerId: number;
  reservationLocator?: string;
  seatReference: string;
  seatingPoolId: number;
  validationType: 'order' | 'reservation';
}

export class SeatInfoApiSuccessEvent extends TrackingEvent<SeatInfoApiSuccessData> {
  constructor(readonly data: SeatInfoApiSuccessData) {
    super(TrackingEvents.SeatInfoApiSuccess, data);
  }
}
