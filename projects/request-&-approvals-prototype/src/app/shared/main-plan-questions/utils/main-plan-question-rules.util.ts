import { QuestionWhen } from '../models/question-when.enum';

export function optionalForWhen(when: QuestionWhen, optionalWhenPreBooking: boolean): boolean {
  if (when === QuestionWhen.POST_BOOKING) {
    return true;
  }

  if (when === QuestionWhen.PRE_BOOKING) {
    return optionalWhenPreBooking;
  }

  return false;
}
