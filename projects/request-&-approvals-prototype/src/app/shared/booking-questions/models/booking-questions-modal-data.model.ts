import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';

import { BookingQuestion } from './booking-question';
import { BookingQuestionsModalTitle } from './booking-questions-modal-title.model';
import { OrderBookingQuestions } from './order-booking-questions.model';

interface BookingQuestionsModalDataBase {
  bookingQuestions: BookingQuestion[];
  cart: Cart;
}

export interface PreBookingQuestionsModalData extends BookingQuestionsModalDataBase {
  kind: 'pre-booking';
  customer?: Customer;
  title?: BookingQuestionsModalTitle;
}

export interface OrderPostBookingQuestionsModalData extends BookingQuestionsModalDataBase {
  kind: 'post-booking-order';
  order: Order;
}

export interface OrdersPostBookingQuestionsModalData extends BookingQuestionsModalDataBase {
  kind: 'post-booking-orders';
  orders: Order[];
  ordersWithBookingQuestions: OrderBookingQuestions[];
}

export type BookingQuestionsModalData =
  | PreBookingQuestionsModalData
  | OrderPostBookingQuestionsModalData
  | OrdersPostBookingQuestionsModalData;
