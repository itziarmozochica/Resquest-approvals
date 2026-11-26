import { BookingAnswerPayload } from '../models/booking-answer-payload';
import { BookingQuestion } from '../models/booking-question';
import { BookingQuestionTicketAnswer } from '../models/booking-question-answer';
import { adaptToBookingQuestionAnswerPayload } from './adapt-to-booking-question-answer-payload';

export function adaptToTicketAnswer(question: BookingQuestion, answer: BookingQuestionTicketAnswer): BookingAnswerPayload {
  const mappedAnswer = adaptToBookingQuestionAnswerPayload(question, answer);
  mappedAnswer.ticket_index = answer.ticketIndex;
  return mappedAnswer;
}
