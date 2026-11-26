import { BookingQuestion } from './booking-question';
import { BookingQuestionElement } from './booking-question-element';
import { BookingQuestionElementType } from './booking-question-element-type';

export interface SingleBookingQuestion extends BookingQuestionElement {
  type: BookingQuestionElementType.SINGLE;
  question: BookingQuestion;
}
