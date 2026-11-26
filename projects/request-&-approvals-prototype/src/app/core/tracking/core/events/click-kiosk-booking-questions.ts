import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickKioskBookingQuestionsData {
  cartId: string;
  customerId?: number;
}

export class ClickKioskBookingQuestionsEvent extends TrackingEvent<ClickKioskBookingQuestionsData> {
  constructor(readonly data: ClickKioskBookingQuestionsData) {
    super(TrackingEvents.ClickKioskBookingQuestions, data);
  }
}
