import { BookingQuestionWhen } from '@fz-original/app/shared/booking-questions/models';
import { BookingQuestionsAnswersPayload } from '@fz-original/app/shared/booking-questions/models/responses/booking-questions-answers.payload';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SendBookingAnswersData {
  type: BookingQuestionWhen;
  data: BookingQuestionsAnswersPayload;
  cart_id?: string;
  order_id?: number;
  channel?: string;
}

export class SendBookingAnswersEvent extends TrackingEvent<SendBookingAnswersData> {
  constructor(readonly data: SendBookingAnswersData) {
    super(TrackingEvents.SendBookingAnswers, data);
  }
}
