import { UntypedFormGroup } from '@angular/forms';

import { BaseErrorResponse } from '../../models/base-response';
import { adaptBookingAnswersError } from '../adapters/booking-answers-error.adapter';
import { BOOKING_QUESTIONS_INVALID_ANSWERS_ERROR_CODE, BookingAnswersError, BookingQuestionsFormData } from '../models';
import { markRejectedBookingAnswers } from './mark-rejected-booking-answers.util';

/** Translation keys each host shows when fever2 gives no `user_error`. */
export interface BookingAnswersRejectionMessages {
  /** The answers were not saved for a reason other than their values. */
  generic: string;
  /** Some answers were rejected and the flagged fields can be reviewed. */
  invalidAnswers: string;
  /** The answers were rejected but nothing in the form can be changed to fix it. */
  cannotFix: string;
}

export interface BookingAnswersRejectionOutcome {
  /** A translation key when `translate` is true, otherwise the `user_error` fever2 sent. */
  message: string;
  translate: boolean;
  rejection: BookingAnswersError;
  /** Resubmitting the same answers would fail again: nothing could be flagged in the form. */
  unfixable: boolean;
}

/**
 * Decides what to tell the operator when fever2 rejects the answers, after flagging the rejected fields in the form.
 * Shared by every host of the booking questions form (box office modal, kiosk) so they agree on the outcome.
 */
export function applyBookingAnswersRejection(
  error: BaseErrorResponse,
  formGroup: UntypedFormGroup,
  formData: BookingQuestionsFormData,
  messages: BookingAnswersRejectionMessages,
): BookingAnswersRejectionOutcome {
  const rejection = adaptBookingAnswersError(error);

  if (Number(rejection.code) !== BOOKING_QUESTIONS_INVALID_ANSWERS_ERROR_CODE) {
    return toOutcome(rejection, messages.generic, false);
  }
  const hasDetails = rejection.invalidAnsweredQuestions.length > 0 || rejection.invalidQuestionIds.length > 0;
  const flaggedControls = markRejectedBookingAnswers(formGroup, formData, rejection);
  if (hasDetails && flaggedControls === 0) {
    return { message: messages.cannotFix, rejection, translate: true, unfixable: true };
  }

  return toOutcome(rejection, messages.invalidAnswers, false);
}

function toOutcome(rejection: BookingAnswersError, fallbackKey: string, unfixable: boolean): BookingAnswersRejectionOutcome {
  return rejection.userError === undefined
    ? { message: fallbackKey, rejection, translate: true, unfixable }
    : { message: rejection.userError, rejection, translate: false, unfixable };
}
