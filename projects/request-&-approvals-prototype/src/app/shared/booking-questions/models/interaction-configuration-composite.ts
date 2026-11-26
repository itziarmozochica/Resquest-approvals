import { BookingQuestionInteractionMode } from './booking-question-interaction-mode';
import { CompositeQuestionTemplateAttribute } from './composite-question-template-attribute';

export interface InteractionConfigurationComposite {
  interactionMode: BookingQuestionInteractionMode.COMPOSITE_QUESTION;
  templateId: string;
  templateAttribute: CompositeQuestionTemplateAttribute;
  order: number;
}
