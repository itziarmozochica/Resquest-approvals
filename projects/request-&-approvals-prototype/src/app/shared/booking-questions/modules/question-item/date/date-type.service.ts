import { Injectable } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';

import { BookingQuestion, BookingQuestionType, FormGroupControl } from '../../../models';
import { dateInRangeValidator } from '../../form-group/date-type/date-type.validator';

@Injectable()
export class DateTypeFormGroupControl implements FormGroupControl<string, string> {
  type(): BookingQuestionType {
    return 'date';
  }

  create(question: BookingQuestion): UntypedFormControl {
    const control = new UntypedFormControl(question.defaultValues?.length ? question.defaultValues[0] : null);
    const validators = [];

    if (!question.optional) {
      validators.push(Validators.required);
    }

    if (question.range && question.range.min && question.range.max) {
      validators.push(dateInRangeValidator(question.range));
    }

    control.setValidators(validators);
    return control;
  }

  value(_: BookingQuestion, value: string): string {
    return value;
  }

  displayValue(question: BookingQuestion, value: string): string {
    return this.value(question, value);
  }
}
