import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';

import { BookingQuestion, BookingQuestionType, FormGroupControl } from '../../../models';
import { numberTypeValidator } from '../../form-group/number-type/number-type.validator';
import { TextTypeFormGroupControl } from '../text/text-type.service';

@Injectable()
export class NumberTypeFormGroupControl extends TextTypeFormGroupControl implements FormGroupControl<string, string> {
  create(question: BookingQuestion): UntypedFormControl {
    const control: UntypedFormControl = super.create(question);
    control.addValidators(numberTypeValidator);
    return control;
  }

  type(): BookingQuestionType {
    return 'number';
  }
}
