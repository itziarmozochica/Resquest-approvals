import { AbstractControl, UntypedFormGroup } from '@angular/forms';

import { getBookingQuestionControlId } from '../../utils/booking-questions.utils';
import { BookingAnswersError, BookingQuestionsFormData, RejectedBookingAnswer } from '../models';

export const BOOKING_ANSWER_SERVER_ERROR = 'server';

/**
 * Flags the controls of the answers fever2 rejected with a `server` error, keeping every value. Angular recomputes a
 * control's errors from its validators on the next value change, so editing the answer clears the flag.
 * A per-ticket question reported with a `null` index flags every control of that question. A question only listed in
 * `invalidQuestionIds` (a missing or unknown answer) flags only its empty controls: a filled one was sent and rejected
 * for a reason the operator cannot change from the form, so flagging it would only loop on the same rejection.
 * Returns the number of controls flagged: 0 means the operator has nothing to fix in the form.
 */
export function markRejectedBookingAnswers(
  formGroup: UntypedFormGroup,
  formData: BookingQuestionsFormData,
  rejection: Pick<BookingAnswersError, 'invalidAnsweredQuestions' | 'invalidQuestionIds'>,
): number {
  const controls = new Set<AbstractControl>(
    rejection.invalidAnsweredQuestions.flatMap(rejectedAnswer => findRejectedControls(formGroup, formData, rejectedAnswer)),
  );
  const coveredQuestionIds = new Set(rejection.invalidAnsweredQuestions.map(({ questionId }) => questionId));
  rejection.invalidQuestionIds
    .filter(questionId => !coveredQuestionIds.has(questionId))
    .flatMap(questionId => findAllQuestionControls(formGroup, formData, questionId))
    .filter(control => isEmptyAnswerValue(control.value))
    .forEach(control => controls.add(control));

  controls.forEach(control => {
    control.setErrors({ ...control.errors, [BOOKING_ANSWER_SERVER_ERROR]: true });
    control.markAsTouched();
  });

  return controls.size;
}

function findRejectedControls(
  formGroup: UntypedFormGroup,
  formData: BookingQuestionsFormData,
  { questionId, ticketIndex }: RejectedBookingAnswer,
): AbstractControl[] {
  if (ticketIndex !== null) {
    return findTicketControls(formGroup, formData, questionId, ticketIndex);
  }
  const perOrderControls = findPerOrderControls(formGroup, formData, questionId);

  return perOrderControls.length > 0 ? perOrderControls : findAllQuestionControls(formGroup, formData, questionId);
}

function findAllQuestionControls(formGroup: UntypedFormGroup, formData: BookingQuestionsFormData, questionId: string): AbstractControl[] {
  return [
    ...findPerOrderControls(formGroup, formData, questionId),
    ...formData.perTicket.flatMap((_, ticketIndex) => findTicketControls(formGroup, formData, questionId, ticketIndex)),
  ];
}

function findPerOrderControls(formGroup: UntypedFormGroup, formData: BookingQuestionsFormData, questionId: string): AbstractControl[] {
  return formData.perOrder
    .filter(question => question.id === questionId)
    .map(question => formGroup.get(getBookingQuestionControlId({ questionId, sessionTypeId: question.sessionTypeId })))
    .filter((control): control is AbstractControl => control !== null);
}

function findTicketControls(
  formGroup: UntypedFormGroup,
  formData: BookingQuestionsFormData,
  questionId: string,
  ticketIndex: number,
): AbstractControl[] {
  return (formData.perTicket[ticketIndex] ?? [])
    .filter(question => question.id === questionId)
    .map(question => formGroup.get(getBookingQuestionControlId({ questionId, sessionTypeId: question.sessionTypeId, ticketIndex })))
    .filter((control): control is AbstractControl => control !== null);
}

/** Nothing answered yet: no value, an empty string, an unchecked box, or a composite (tel, choices) with every part empty. */
function isEmptyAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined || value === false) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.every(isEmptyAnswerValue);
  }
  if (typeof value === 'object') {
    return Object.values(value).every(isEmptyAnswerValue);
  }

  return false;
}
