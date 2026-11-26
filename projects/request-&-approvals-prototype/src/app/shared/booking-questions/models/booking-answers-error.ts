/** fever2 `BOOKING_QUESTIONS_INVALID_ANSWERS_VALUES`: one or more answers were rejected. */
export const BOOKING_QUESTIONS_INVALID_ANSWERS_ERROR_CODE = 50030003;

export interface RejectedBookingAnswer {
  questionId: string;
  /** 0-based ticket index of the form, `null` for a per-order question. */
  ticketIndex: number | null;
}

export interface BookingAnswersError {
  code: number | string;
  invalidAnsweredQuestions: RejectedBookingAnswer[];
  /** Every rejected question, also the ones fever2 cannot tie to a ticket (a missing or unknown answer). */
  invalidQuestionIds: string[];
  userError?: string;
}
