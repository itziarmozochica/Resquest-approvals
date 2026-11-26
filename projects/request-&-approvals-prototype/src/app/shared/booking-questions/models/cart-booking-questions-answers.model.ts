export interface CartBookingQuestionAnswerSnapshot {
  answerId: string;
  questionId: string;
  /**
   * The current BE (`CartBookingQuestionAnswerSchema`) never sends this field.
   * It is kept optional for forward-compatibility only; consumers must join the
   * label from the questions catalog via `questionId` until BE starts sending it.
   */
  questionLabel?: string;
  /** From BE `session_type_id` — required to align shared question ids across ticket types. */
  sessionTypeId?: number;
  values: string[];
}

export interface CartBookingQuestionsAnswers {
  answersPerOrder: CartBookingQuestionAnswerSnapshot[];
  answersByTicketIndex: Record<number, CartBookingQuestionAnswerSnapshot[]>;
}
