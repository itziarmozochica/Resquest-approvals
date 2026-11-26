import { BookingQuestionInteractionMode } from './booking-question-interaction-mode';

export interface InteractionConfigurationConditional {
  interactionMode: BookingQuestionInteractionMode.CONDITIONAL_QUESTION;
  parentBookingQuestionId: string;
  parentTriggerAnswers: string[] | null;
}
