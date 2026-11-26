import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';

import { buildFormBookingQuestionId } from '@fz-original/app/shared/utils/booking-questions.utils';

import { BookingQuestion, BookingQuestionChoiceForm, ChoiceAdditionalQuestionAnswer } from '../../../models';
import { QuestionItemComponent } from '../question-item.component';

@Component({
  selector: 'fv-multiple-choice-question-item',
  standalone: false,
  templateUrl: './multiple-choice-question-item.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultipleChoiceQuestionItemComponent extends QuestionItemComponent {
  @Input() override formGroup!: UntypedFormGroup;
  @Input() override question!: BookingQuestion;
  @Input() override controlId!: string;

  selectedElements: Array<string> = [];
  control!: AbstractControl;

  onCheckChange(event: Event): void {
    const target = event.target as HTMLInputElement;

    if (target.checked) {
      this.selectedElements.push(target.value);
    } else {
      const element = this.selectedElements.indexOf(target.value);
      this.selectedElements.splice(element, 1);
      this.searchAndDeleteAssociatedQuestion(target.value);
    }

    this.control = this.formGroup.get(this.controlId || buildFormBookingQuestionId(this.question))!;

    this.control.setValue(
      this.selectedElements.length > 0
        ? this.mapToAnswerForm(
            this.selectedElements,
            this.control.value?.additionalQuestions?.length > 0 ? this.control.value?.additionalQuestions : null,
          )
        : null,
    );
  }

  onInputChange(event: Event, choice: string): void {
    const target = event.target as HTMLInputElement;
    this.control = this.formGroup.get(this.controlId || this.question.id)!;

    this.searchAndDeleteAssociatedQuestion(choice);

    const additionalQuestions = this.control.value.additionalQuestions || [];
    additionalQuestions.push({ choice: choice, answer: target.value });

    this.control.setValue(this.mapToAnswerForm(this.control.value.choices, additionalQuestions));
  }

  trackByQuestionId(index: number): number {
    return index;
  }

  private mapToAnswerForm(choices: Array<string>, additionalQuestions: Array<ChoiceAdditionalQuestionAnswer>): BookingQuestionChoiceForm {
    return {
      choices: choices,
      additionalQuestions: additionalQuestions,
    };
  }

  private searchAndDeleteAssociatedQuestion(choice: string): void {
    this.control.value?.additionalQuestions?.forEach((question: ChoiceAdditionalQuestionAnswer, index: number) => {
      if (question.choice === choice) {
        this.control.value?.additionalQuestions.splice(index, 1);
      }
    });
  }
}
