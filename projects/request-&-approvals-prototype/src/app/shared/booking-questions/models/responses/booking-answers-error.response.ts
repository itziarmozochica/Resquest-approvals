export interface InvalidAnsweredQuestionResponse {
  question_id: string;
  /** 1-based, the `ticket_index` the client sent; `null` for a per-order question. */
  ticket_index: number | null;
}

/** The `error` object of the 400 fever2 returns when it rejects booking-question answers. */
export interface BookingAnswersErrorResponse {
  code: number | string;
  message: string;
  invalid_answered_questions?: InvalidAnsweredQuestionResponse[];
  invalid_answers_question_ids?: string[];
  user_error?: string;
}
