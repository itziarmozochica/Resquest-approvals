import { Pipe, PipeTransform } from '@angular/core';
import { FormControl, FormGroup, UntypedFormGroup } from '@angular/forms';

import { distinctUntilChanged, map, Observable, of, startWith, tap } from 'rxjs';

import { getBookingQuestionControlId } from '../../utils/booking-questions.utils';
import { BookingQuestion } from '../models/booking-question';
import { BookingQuestionInteractionMode } from '../models/booking-question-interaction-mode';
import { InteractionConfiguration } from '../models/interaction-configuration';
import { InteractionConfigurationConditional } from '../models/interaction-configuration-conditional';

@Pipe({
  name: 'conditionalQuestion',
  standalone: true,
})
export class ConditionalQuestionPipe implements PipeTransform {
  transform(bookingQuestion: BookingQuestion, formGroup: UntypedFormGroup): Observable<boolean> {
    const interactionConfiguration = bookingQuestion.interactionConfiguration;
    if (!this.isConditionalQuestion(interactionConfiguration)) {
      return of(true);
    }

    const controlId = bookingQuestion.formControlId ?? '';
    const parentControl = this.getParentControl(
      formGroup,
      interactionConfiguration.parentBookingQuestionId,
      controlId,
      bookingQuestion.sessionTypeId,
    );
    if (!parentControl) {
      return of(true);
    }

    const control = formGroup.get(controlId) as FormControl;

    return parentControl.valueChanges.pipe(
      startWith(parentControl.value),
      map(parentValue => this.isParentValueValid(parentValue, interactionConfiguration.parentTriggerAnswers)),
      distinctUntilChanged(),
      tap(showControl => {
        if (showControl && !formGroup.get(controlId)) {
          formGroup.addControl(controlId, control);
        } else if (!showControl && formGroup.get(controlId)) {
          formGroup.removeControl(controlId);
        }
        formGroup.updateValueAndValidity();
      }),
    );
  }

  private getParentControl(
    formGroup: FormGroup,
    parentQuestionId: string,
    formControlId: string,
    sessionTypeId?: number,
  ): FormControl | null {
    const ticketIndex = this.getParentTicketIndex(formControlId) ?? undefined;
    const parentControlId = getBookingQuestionControlId({ questionId: parentQuestionId, ticketIndex, sessionTypeId });
    return formGroup.get(parentControlId) as FormControl;
  }

  private getParentTicketIndex(formControlId: string): number | null {
    const parts = formControlId.split('#');
    if (parts.length == 2) {
      const ticketIndex = parts[1];
      return parseInt(ticketIndex);
    }
    return null;
  }

  private isConditionalQuestion(
    interactionConfiguration: InteractionConfiguration | undefined,
  ): interactionConfiguration is InteractionConfigurationConditional {
    return interactionConfiguration?.interactionMode === BookingQuestionInteractionMode.CONDITIONAL_QUESTION;
  }

  // FIXME we need to properly get the parent value depending on the type question
  private isParentValueValid(parentValue: any, parentTriggerAnswers: string[] | null): boolean {
    let value;

    if (typeof parentValue === 'boolean') {
      // checkbox_with_terms
      // these are the only type of questions which return a boolean value
      return parentValue;
    } else if (parentValue?.prefix) {
      // tel
      value = [parentValue?.phone];
    } else if (parentValue?.choice) {
      // single_choice
      value = [parentValue?.choice];
    } else if (parentValue?.choices) {
      // multiple_choice
      value = parentValue?.choices;
    } else if (parentValue?.name && parentValue?.lastModified) {
      // image
      return !!parentValue.name;
    } else {
      // text
      value = [parentValue];
    }

    if (!parentTriggerAnswers) {
      return parentValue !== null && parentValue !== undefined && value[0]?.length > 0;
    }

    return value.some((someValue: any) => parentTriggerAnswers.includes(someValue));
  }
}
