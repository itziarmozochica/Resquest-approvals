import { ErrorWithContext } from '../../services/error-logger/error-with-context';
import { BookingAnswersError } from '../models';

/**
 * fever2 rejected the answers but none of the form's fields could be flagged (a missing or unknown answer, a question
 * the form does not render), so the operator cannot fix them. Traced so the cases show up in Datadog.
 */
export function buildUnfixableBookingAnswersError(rejection: BookingAnswersError, source: string): ErrorWithContext {
  return new ErrorWithContext('Booking answers rejected with no field to flag', {
    code: rejection.code,
    invalidAnsweredQuestions: rejection.invalidAnsweredQuestions.map(({ questionId, ticketIndex }) => ({ questionId, ticketIndex })),
    invalidQuestionIds: rejection.invalidQuestionIds,
    source,
    userError: rejection.userError ?? null,
  });
}
