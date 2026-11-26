import { BookingAnswerPayload } from '../booking-answer-payload';

export interface BookingQuestionsAnswersPayload {
  answers_per_order: BookingAnswerPayload[];
  answers_per_ticket: BookingAnswerPayload[][];
}
