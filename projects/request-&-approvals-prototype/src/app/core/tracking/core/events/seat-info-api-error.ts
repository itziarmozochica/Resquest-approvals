import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SeatInfoApiErrorData {
  errorMessage: string;
  mainPlanId: number;
  partnerId: number;
  seatReference: string;
  seatingPoolId: number;
}

export class SeatInfoApiErrorEvent extends TrackingEvent<SeatInfoApiErrorData> {
  constructor(readonly data: SeatInfoApiErrorData) {
    super(TrackingEvents.SeatInfoApiError, data);
  }
}
