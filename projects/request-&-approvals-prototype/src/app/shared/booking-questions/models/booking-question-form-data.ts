import { BookingQuestion } from './booking-question';
import { BookingQuestionOrderDetails } from './booking-question-order-details';
import { BookingQuestionTicketDetails } from './booking-question-ticket-details';

export interface BookingQuestionsFormData {
  perOrder: Array<BookingQuestion>;
  perTicket: Array<Array<BookingQuestion>>;
  ticketDetails?: Array<BookingQuestionTicketDetails>;
  orderDetails?: BookingQuestionOrderDetails | null;
}
