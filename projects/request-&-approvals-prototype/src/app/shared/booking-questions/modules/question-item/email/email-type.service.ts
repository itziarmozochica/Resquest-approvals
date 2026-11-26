import { Injectable } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';

import { BookingQuestion, BookingQuestionType, FormGroupControl } from '../../../models';
import { TextTypeFormGroupControl } from '../text/text-type.service';

@Injectable()
export class EmailTypeFormGroupControl extends TextTypeFormGroupControl implements FormGroupControl<string, string> {
  type(): BookingQuestionType {
    return 'email';
  }

  create(question: BookingQuestion): UntypedFormControl {
    const control: UntypedFormControl = super.create(question);
    control.addValidators(Validators.email);
    return control;
  }
}
