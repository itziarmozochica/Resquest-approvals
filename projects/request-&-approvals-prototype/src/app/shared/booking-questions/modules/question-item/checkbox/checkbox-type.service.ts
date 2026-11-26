import { Injectable } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';

import { BookingQuestion, BookingQuestionType, FormGroupControl } from '../../../models';
import { checkboxRequiredValidator } from '../../form-group/checkbox-type/checkbox-type.validator';

@Injectable()
export class CheckBoxTypeFormGroupControl implements FormGroupControl<string, string> {
  type(): BookingQuestionType {
    return 'checkbox_with_terms';
  }

  create(question: BookingQuestion): UntypedFormControl {
    const control = new UntypedFormControl(question.defaultValues?.length ? question.defaultValues[0] : null);
    const validators = [];

    if (!question.optional) {
      validators.push(Validators.required);
    }

    validators.push(checkboxRequiredValidator());

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
