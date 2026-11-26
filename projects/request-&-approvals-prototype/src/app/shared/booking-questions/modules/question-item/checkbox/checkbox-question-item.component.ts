import { ChangeDetectionStrategy, Component, forwardRef, Input, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, UntypedFormGroup } from '@angular/forms';

import { buildFormBookingQuestionId } from '@fz-original/app/shared/utils/booking-questions.utils';

import { BookingQuestion } from '../../../models';
import { QuestionItemComponent } from '../question-item.component';

@Component({
  selector: 'fv-checkbox-question-item',
  standalone: false,
  templateUrl: './checkbox-question-item.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckBoxQuestionItemComponent),
      multi: true,
    },
  ],
})
export class CheckBoxQuestionItemComponent extends QuestionItemComponent implements ControlValueAccessor {
  @Input() override controlId!: string;
  @Input() override formGroup!: UntypedFormGroup;
  isDisabled = false;
  onChange?: (_: boolean) => void;
  onTouched?: () => void;
  @Input() override question!: BookingQuestion;

  onToggleCheckbox($event: Event) {
    this.writeValue(($event.target as HTMLInputElement).checked);
  }

  registerOnChange(fn: (_: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  writeValue(value: boolean): void {
    const formControl = this.formGroup.controls[this.controlId || buildFormBookingQuestionId(this.question)];
    if (value) {
      formControl.setValue(value.toString());
    } else {
      formControl.reset(null);
    }
  }
}
