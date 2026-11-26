import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';

import { BookingQuestion, BookingQuestionType, FormGroupControl } from '../../../models';
import { multipleChoiceRequiredValidator } from '../../form-group/multiple-choice-type/multiple-choice-type.validator';

@Injectable()
export class MultipleChoiceTypeFormGroupControl implements FormGroupControl<Array<string>, Array<string>> {
  type(): BookingQuestionType {
    return 'multiple_choice';
  }

  create(question: BookingQuestion): UntypedFormControl {
    const control = new UntypedFormControl(question.defaultValues?.length ? question.defaultValues[0] : null);
    const validators = [];

    if (!question.optional) {
      validators.push(multipleChoiceRequiredValidator());
      control.setValidators(validators);
    }

    return control;
  }

  value(_: BookingQuestion, value: Array<string>): Array<string> {
    return value;
  }

  displayValue(question: BookingQuestion, value?: Array<string>): Array<string> {
    if (!value) {
      return [];
    }
    const labels: Array<string> = [];

    for (const choiceItemValue of value) {
      const choice = question.choices?.find(c => c.value === choiceItemValue);
      if (choice) {
        labels.push(choice.label);
      }
    }
    return labels;
  }
}
