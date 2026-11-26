import { AbstractControl } from '@angular/forms';

import { BookingQuestion } from './booking-question';
import { BookingQuestionType } from './booking-question-type';

export interface FormGroupControl<T, K> {
  type(): BookingQuestionType;
  create(question: BookingQuestion): AbstractControl;
  value(question: BookingQuestion, value: T): K | null;
  displayValue(question: BookingQuestion, value: T): K | null;
}
