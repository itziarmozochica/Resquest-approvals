import { Order } from '@fz-original/app/shared/models/order/order.model';

import { BookingQuestion } from './booking-question';

export interface OrderBookingQuestions {
  order: Order;
  questions: BookingQuestion[];
}
