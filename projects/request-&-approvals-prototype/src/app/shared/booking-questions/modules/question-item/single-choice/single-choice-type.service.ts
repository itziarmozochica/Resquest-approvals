import { Injectable } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';

import { BookingQuestion, BookingQuestionType, FormGroupControl } from '../../../models';

@Injectable()
export class SingleChoiceTypeFormGroupControl implements FormGroupControl<{ choice: string }, string> {
  type(): BookingQuestionType {
    return 'single_choice';
  }

  create(question: BookingQuestion): UntypedFormControl {
    const control = new UntypedFormControl(question.defaultValues?.length ? { choice: question.defaultValues[0] } : null);
    if (!question.optional) {
      control.setValidators(Validators.required);
    }
    return control;
  }

  value(_: BookingQuestion, value: { choice: string } | null): string | null {
    return value ? value.choice : null;
  }

  displayValue(question: BookingQuestion, value: { choice: string } | null): string | null {
    if (!value) {
      return null;
    }

    const choice = question.choices?.find(c => c.value === value.choice);
    return choice?.label || null;
  }
}
