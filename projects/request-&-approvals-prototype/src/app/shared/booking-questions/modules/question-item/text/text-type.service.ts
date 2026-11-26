import { Injectable } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';

import { BookingQuestion, BookingQuestionType, FormGroupControl } from '../../../models';

@Injectable()
export class TextTypeFormGroupControl implements FormGroupControl<string, string> {
  type(): BookingQuestionType {
    return 'text';
  }

  create(question: BookingQuestion): UntypedFormControl {
    const control = new UntypedFormControl(question.defaultValues?.length ? question.defaultValues[0] : null);
    if (!question.optional) {
      control.setValidators(Validators.required);
    }

    return control;
  }

  value(_: BookingQuestion, value: string): string {
    return value;
  }

  displayValue(question: BookingQuestion, value: string): string {
    return this.value(question, value);
  }
}
