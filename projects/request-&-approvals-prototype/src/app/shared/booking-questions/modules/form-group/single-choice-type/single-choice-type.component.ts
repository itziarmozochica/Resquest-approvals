import { ChangeDetectionStrategy, Component, forwardRef, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { SelectOption } from '../../../../layout/filters/select/select.interface';
import { BookingQuestion } from '../../../models/booking-question';
import { BookingQuestionChoice } from '../../../models/booking-question-choice';

interface SingleChoiceAdditionalQuestionAnswer {
  choice: unknown;
  additionalQuestions?: unknown;
}

@Component({
  selector: 'fv-booking-question-single-choice',
  standalone: false,
  templateUrl: './single-choice-type.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SingleChoiceTypeComponent),
      multi: true,
    },
  ],
})
export class SingleChoiceTypeComponent implements ControlValueAccessor, OnChanges {
  @Input() id!: string;
  @Input() question!: BookingQuestion;

  @Input() set error(value: string) {
    switch (value) {
      case 'required':
        this.errorMessage = 'bookingQuestionsForm.validations.required';
        break;
      case 'server':
        this.errorMessage = 'bookingQuestionsForm.error.rejectedByServer';
        break;
    }
  }

  #OTHER_OPTION = 'Other';

  onChange?: (_: SingleChoiceAdditionalQuestionAnswer | null) => void;
  onTouched?: () => void;
  isDisabled = false;

  choicesOptions: SelectOption[] = [];
  choiceSelected: SelectOption[] = [];
  hasAdditionalQuestion = false;
  errorMessage: string | null = null;
  selectedElement: SingleChoiceAdditionalQuestionAnswer | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.question?.currentValue) {
      this.choicesOptions = changes.question.currentValue.choices.map((choice: BookingQuestionChoice) => {
        return { id: choice.value, title: choice.label };
      });
      if (this.selectedElement !== null) {
        this.choiceSelected = this.choicesOptions.filter((opt: SelectOption) => opt.id === this.selectedElement?.choice);
      }
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  writeValue(value: SingleChoiceAdditionalQuestionAnswer): void {
    if (value?.choice) {
      const option = this.choicesOptions.find(opt => opt.id === value.choice);
      if (option) {
        this.choiceSelected = [option];
        this.setSelectedElement(option);
      }
    } else {
      this.choiceSelected = [];
      this.selectedElement = null;
    }
  }

  onSelectChange(option: SelectOption[]): void {
    if (option?.length > 0) {
      this.errorMessage = null;
      this.setSelectedElement(option[0]);
    } else {
      this.selectedElement = null;
      this.onChange?.(null);
    }
  }

  private setSelectedElement(option: SelectOption) {
    if (option) {
      const additionalQuestion = this.question.choices?.find(
        choice => option.id === this.#OTHER_OPTION && choice.value === option.id && choice.additionalQuestion,
      );
      this.hasAdditionalQuestion = !!additionalQuestion;
      const choice = this.findChoice(option);
      this.selectedElement = { choice: choice?.value, additionalQuestions: additionalQuestion };
    } else {
      this.selectedElement = null;
    }

    this.onChange?.(this.selectedElement);
  }

  findChoice(option: SelectOption): BookingQuestionChoice | null {
    return this.question.choices?.find(c => c.value === option.id) || null;
  }
}
