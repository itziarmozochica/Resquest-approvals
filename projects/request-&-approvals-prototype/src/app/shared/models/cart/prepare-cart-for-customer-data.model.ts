import { BookingQuestion } from '../../booking-questions/models/booking-question';
import { BaseResponse } from '../base-response';
import { Cart, CartData } from './cart.model';
import { PreparedCartBookingQuestionsStatus } from './prepared-cart-booking-questions-status.enum';

export interface CartWithBookingQuestionsData {
  cart: CartData;
  booking_questions?: unknown[] | null;
}

export type PrepareCartForCustomerData = CartData | CartWithBookingQuestionsData;

export type PreparedCartBookingQuestions =
  | { questions: BookingQuestion[]; status: PreparedCartBookingQuestionsStatus.AVAILABLE }
  | { status: PreparedCartBookingQuestionsStatus.MALFORMED | PreparedCartBookingQuestionsStatus.UNAVAILABLE };

/** A Prepare V2.1 answer: the cart exactly as `prepareAndGetCartForCustomer` answers it, and the cart's questions. */
export interface PreparedCartWithBookingQuestions {
  bookingQuestions: PreparedCartBookingQuestions;
  cart: BaseResponse<Cart | null>;
}
