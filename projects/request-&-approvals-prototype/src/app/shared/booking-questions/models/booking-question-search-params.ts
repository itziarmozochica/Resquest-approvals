import { BookingQuestionFrequency } from './booking-question-frequency';
import { BookingQuestionWhen } from './booking-question-when';

export interface BookingQuestionSearchParams {
  when?: BookingQuestionWhen;
  frequency?: BookingQuestionFrequency;
}
