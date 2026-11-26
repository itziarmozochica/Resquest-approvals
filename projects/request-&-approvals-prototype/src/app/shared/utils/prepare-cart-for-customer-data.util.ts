import { adaptBookingQuestionResponse } from '../booking-questions/adapters/adapt-booking-questions-response';
import { BookingQuestionsResponse } from '../booking-questions/models/responses/booking-questions.response';
import { CartData } from '../models/cart/cart.model';
import {
  CartWithBookingQuestionsData,
  PrepareCartForCustomerData,
  PreparedCartBookingQuestions,
} from '../models/cart/prepare-cart-for-customer-data.model';
import { PreparedCartBookingQuestionsStatus } from '../models/cart/prepared-cart-booking-questions-status.enum';

export function readCartData(data: PrepareCartForCustomerData | null | undefined): CartData | null {
  return isCartWithBookingQuestionsData(data) ? data.cart : (data ?? null);
}

/**
 * The questions partners read with the prepare: fever2's own questions GET items, so they adapt exactly as that GET's.
 * partners answers `null` for any failed read and the bare cart before it returned them, both `UNAVAILABLE`.
 */
export function readPreparedCartBookingQuestions(data: PrepareCartForCustomerData | null | undefined): PreparedCartBookingQuestions {
  const bookingQuestions: unknown = isCartWithBookingQuestionsData(data) ? data.booking_questions : null;
  if (bookingQuestions == null) {
    return { status: PreparedCartBookingQuestionsStatus.UNAVAILABLE };
  }
  if (!Array.isArray(bookingQuestions) || !bookingQuestions.every(isBookingQuestionsResponse)) {
    return { status: PreparedCartBookingQuestionsStatus.MALFORMED };
  }
  return { questions: bookingQuestions.map(adaptBookingQuestionResponse), status: PreparedCartBookingQuestionsStatus.AVAILABLE };
}

function isCartWithBookingQuestionsData(data: PrepareCartForCustomerData | null | undefined): data is CartWithBookingQuestionsData {
  return data != null && 'cart' in data && typeof data.cart === 'object' && data.cart !== null;
}

/** The two fields partners itself checks before it returns a question. */
function isBookingQuestionsResponse(item: unknown): item is BookingQuestionsResponse {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof (item as Partial<BookingQuestionsResponse>).question_id === 'string' &&
    typeof (item as Partial<BookingQuestionsResponse>).when === 'string'
  );
}
