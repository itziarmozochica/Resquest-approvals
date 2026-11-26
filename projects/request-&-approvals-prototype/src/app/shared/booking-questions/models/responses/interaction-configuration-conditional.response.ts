export interface InteractionConfigurationConditionalResponse {
  interaction_mode: 'CONDITIONAL_QUESTION';
  parent_booking_question_id: string;
  parent_trigger_answers: string[] | null;
}
