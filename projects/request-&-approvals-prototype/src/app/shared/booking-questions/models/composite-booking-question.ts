import { BookingQuestion } from './booking-question';
import { BookingQuestionElement } from './booking-question-element';
import { BookingQuestionElementType } from './booking-question-element-type';

export interface CompositeBookingQuestion extends BookingQuestionElement {
  type: BookingQuestionElementType.COMPOSITE;
  questions: BookingQuestion[];
}
