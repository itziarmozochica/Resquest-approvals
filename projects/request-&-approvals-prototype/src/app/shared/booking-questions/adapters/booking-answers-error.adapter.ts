import { HttpErrorResponse } from '@angular/common/http';

import { BaseErrorResponse } from '../../models/base-response';
import { BOOKING_QUESTIONS_INVALID_ANSWERS_ERROR_CODE, BookingAnswersError, RejectedBookingAnswer } from '../models/booking-answers-error';
import { InvalidAnsweredQuestionResponse } from '../models/responses/booking-answers-error.response';

/**
 * Reads the details fever2 adds to a rejected answers request (`BookingAnswersErrorResponse`), found at
 * `error.error.error.error`. `ticket_index` comes 1-based and is returned as the 0-based index of the form controls.
 * A body without details (older fever2, other errors) yields no rejected answers and no question ids.
 */
export function adaptBookingAnswersError(error: BaseErrorResponse): BookingAnswersError {
  const details = getErrorDetails(error);
  const userError: unknown = details['user_error'] ?? error.userError;

  return {
    code: error.code,
    ...(isNonEmptyString(userError) && { userError }),
    invalidAnsweredQuestions: readInvalidAnsweredQuestions(details).map(toRejectedAnswer),
    invalidQuestionIds: readInvalidQuestionIds(details),
  };
}

/**
 * Joins the rejections of several orders saved at once (post-booking) into one error, so every rejected field is
 * flagged at the same time. Each order keeps the ticket indexes of the shared form, so they can be concatenated.
 * The merged error takes the first invalid-answers rejection as its base, so an earlier order failing for another
 * reason (network, 500) does not hide the fields a later order rejected.
 */
export function mergeBookingAnswersErrors(errors: BaseErrorResponse[]): BaseErrorResponse {
  const [first, ...rest] = errors;
  if (rest.length === 0) {
    return first;
  }
  const base = errors.find(error => Number(error.code) === BOOKING_QUESTIONS_INVALID_ANSWERS_ERROR_CODE) ?? first;
  const allDetails = errors.map(getErrorDetails);
  // A `user_error` names the questions of its own order only, so with several it would misname the flagged fields:
  // leave it out and let the caller fall back to its generic copy.
  const userErrors = allDetails.map(details => details['user_error']).filter(isNonEmptyString);
  const baseDetails = Object.fromEntries(Object.entries(getErrorDetails(base)).filter(([key]) => key !== 'user_error'));
  const merged: Record<string, unknown> = {
    ...baseDetails,
    ...(userErrors.length === 1 && { user_error: userErrors[0] }),
    invalid_answers_question_ids: [...new Set(allDetails.flatMap(readInvalidQuestionIds))],
    invalid_answered_questions: allDetails.flatMap(readInvalidAnsweredQuestions),
  };

  return { ...base, error: new HttpErrorResponse({ error: { data: null, error: merged }, status: readStatus(base) }) };
}

/** The HTTP status of the raw response, when the error carries one. */
function readStatus(error: BaseErrorResponse): number | undefined {
  const httpError: unknown = error.error;
  const status: unknown = isRecord(httpError) ? httpError['status'] : undefined;

  return typeof status === 'number' ? status : undefined;
}

/** The body's `error` object: `ErrorResponseUtils.getErrorResponse` keeps the raw `HttpErrorResponse` in `error.error`. */
function getErrorDetails(error: BaseErrorResponse): Record<string, unknown> {
  const httpError: unknown = error.error;
  const body: unknown = isRecord(httpError) ? httpError['error'] : null;
  const response: unknown = isRecord(body) ? body['error'] : null;

  return isRecord(response) ? response : {};
}

function readInvalidAnsweredQuestions(details: Record<string, unknown>): InvalidAnsweredQuestionResponse[] {
  const value: unknown = details['invalid_answered_questions'];

  return Array.isArray(value) ? value.filter(isInvalidAnsweredQuestionResponse) : [];
}

function readInvalidQuestionIds(details: Record<string, unknown>): string[] {
  const value: unknown = details['invalid_answers_question_ids'];

  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
}

function isInvalidAnsweredQuestionResponse(value: unknown): value is InvalidAnsweredQuestionResponse {
  if (!isRecord(value) || !isNonEmptyString(value['question_id'])) {
    return false;
  }
  const ticketIndex: unknown = value['ticket_index'];

  return ticketIndex === null || (typeof ticketIndex === 'number' && Number.isInteger(ticketIndex) && ticketIndex >= 1);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRejectedAnswer(answer: InvalidAnsweredQuestionResponse): RejectedBookingAnswer {
  return {
    questionId: answer.question_id,
    ticketIndex: answer.ticket_index === null ? null : answer.ticket_index - 1,
  };
}
