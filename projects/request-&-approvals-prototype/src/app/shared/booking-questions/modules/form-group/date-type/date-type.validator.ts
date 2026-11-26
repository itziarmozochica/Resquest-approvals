import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { BookingQuestionRange } from '../../../models/booking-question-range';

export function dateInRangeValidator(range: BookingQuestionRange): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Date.parse(control.value);
    const minDate = Date.parse(range.min);
    const maxDate = Date.parse(range.max);

    if (value && (value < minDate || value > maxDate)) {
      return { range: true };
    }

    return null;
  };
}
