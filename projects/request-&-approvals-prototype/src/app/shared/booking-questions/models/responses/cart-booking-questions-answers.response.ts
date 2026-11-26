export interface CartBookingQuestionAnswerSnapshotDTO {
  answer_id: string;
  question_id: string;
  /**
   * The current BE (`CartBookingQuestionAnswerSchema`) never sends this field.
   * It is kept optional for forward-compatibility only.
   */
  question_label?: string;
  session_type_id?: number | null;
  /** May be omitted on partial wire payloads; adapter defaults to `[]`. */
  values?: string[];
}

export interface CartBookingQuestionsAnswersDataDTO {
  answers_per_order?: CartBookingQuestionAnswerSnapshotDTO[];
  /** Ticket lists may be null when a ticket index exists without answers yet. */
  answers_by_ticket_index?: Record<string, CartBookingQuestionAnswerSnapshotDTO[] | null>;
}

export interface CartBookingQuestionsAnswersResponseDTO {
  data: CartBookingQuestionsAnswersDataDTO | null;
}
