import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';

import { BookingQuestion } from '../../../models';
import { QuestionItemComponent } from '../question-item.component';

@Component({
  selector: 'fv-single-choice-question-item',
  standalone: false,
  templateUrl: './single-choice-question-item.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SingleChoiceQuestionItemComponent extends QuestionItemComponent {
  @Input() override formGroup!: UntypedFormGroup;
  @Input() override question!: BookingQuestion;
  @Input() override controlId!: string;

  getControlError(control: AbstractControl): string | null | undefined {
    if (!this.formGroup.touched) {
      return null;
    }
    const errors = Object.getOwnPropertyNames(control.errors || {});
    return errors.length > 0 ? errors.shift() : null;
  }
}
