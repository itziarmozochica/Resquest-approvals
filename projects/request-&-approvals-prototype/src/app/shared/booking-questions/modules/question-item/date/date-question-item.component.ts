import { ChangeDetectionStrategy, Component, forwardRef, Input, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, UntypedFormGroup } from '@angular/forms';

import { buildFormBookingQuestionId } from '@fz-original/app/shared/utils/booking-questions.utils';
import moment from 'moment-timezone';

import { BookingQuestion, TelTypeValue } from '../../../models';
import { QuestionItemComponent } from '../question-item.component';

@Component({
  selector: 'fv-date-question-item',
  standalone: false,
  templateUrl: './date-question-item.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateQuestionItemComponent),
      multi: true,
    },
  ],
})
export class DateQuestionItemComponent extends QuestionItemComponent implements ControlValueAccessor {
  @Input() override formGroup!: UntypedFormGroup;
  @Input() override question!: BookingQuestion;
  @Input() override controlId!: string;

  onChange?: (_: TelTypeValue) => void;
  onTouched?: () => void;
  isDisabled = false;

  date: string | null = null;

  timezone = moment.tz.guess();

  readonly DATE_ERRORS = [
    { name: 'required', message: 'bookingQuestionsForm.validations.required' },
    { name: 'range', message: 'bookingQuestionsForm.validations.dateOutsideRange' },
    { name: 'invalid', message: 'bookingQuestionsForm.validations.invalid' },
    { name: 'server', message: 'bookingQuestionsForm.error.rejectedByServer' },
  ];

  onDateSelected($event: string) {
    this.writeValue($event);
  }

  registerOnChange(fn: (_: TelTypeValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  writeValue(value: string): void {
    this.formGroup.controls[this.controlId || buildFormBookingQuestionId(this.question)].setValue(value);
  }
}
