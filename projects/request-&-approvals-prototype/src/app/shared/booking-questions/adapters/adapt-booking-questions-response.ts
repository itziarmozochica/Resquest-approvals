import { BookingQuestionConfiguration } from '@fz-original/app/shared/booking-questions/models/booking-question-configuration';
import { BookingQuestionNominativeTicketConfiguration } from '@fz-original/app/shared/booking-questions/models/booking-question-nominative-ticket-configuration';
import { ConfigurationResponse } from '@fz-original/app/shared/booking-questions/models/responses/configuration.response';

import { BookingQuestion, BookingQuestionWithAnswers } from '../models/booking-question';
import { BookingQuestionInteractionMode } from '../models/booking-question-interaction-mode';
import { CompositeQuestionTemplateAttribute } from '../models/composite-question-template-attribute';
import { InteractionConfiguration } from '../models/interaction-configuration';
import { InteractionConfigurationComposite } from '../models/interaction-configuration-composite';
import { InteractionConfigurationConditional } from '../models/interaction-configuration-conditional';
import { BookingQuestionsResponse, BookingQuestionsWithAnswersResponse } from '../models/responses/booking-questions.response';
import { InteractionConfigurationCompositeResponse } from '../models/responses/interaction-configuration-composite.response';
import { InteractionConfigurationConditionalResponse } from '../models/responses/interaction-configuration-conditional.response';
import { InteractionConfigurationResponse } from '../models/responses/interaction-configuration.response';
import { adaptChoicesData } from './adapt-choices-data';
import { adaptToQuestionChoices } from './adapt-question-choices';

export function adaptBookingQuestionWithAnswersResponse(response: BookingQuestionsWithAnswersResponse): BookingQuestionWithAnswers {
  return {
    ...adaptBookingQuestionResponse(response),
    answers: response.answer,
  };
}

const INTERACTION_CONFIGURATION_ADAPTERS: Record<
  BookingQuestionInteractionMode,
  (response: InteractionConfigurationResponse) => InteractionConfiguration
> = {
  [BookingQuestionInteractionMode.CONDITIONAL_QUESTION]: response =>
    adaptConditionalInteractionConfiguration(response as InteractionConfigurationConditionalResponse),
  [BookingQuestionInteractionMode.COMPOSITE_QUESTION]: response =>
    adaptCompositeInteractionConfiguration(response as InteractionConfigurationCompositeResponse),
};

export function adaptBookingQuestionResponse(response: BookingQuestionsResponse): BookingQuestion {
  const question: BookingQuestion = {
    id: response.question_id,
    label: response.label,
    message: response.message,
    type: response.type,
    choices: response.choices_data
      ? adaptChoicesData(response.choices_data)
      : response.choices
        ? adaptToQuestionChoices(response.choices)
        : null,
    optional: response.optional,
    frequency: response.frequency,
    when: response.when,
    defaultValues: response.default_values,
    visibleInFeverZone: response.visible_in_fever_zone ?? true,
    range: response.range || null,
    mainPlanId: response.main_plan_id,
    sessionTypeId: response.session_type_id,
    configuration: response.configuration ? adaptConfiguration(response.configuration) : null,
  };

  if (response.session_types) {
    question.sessionTypes = response.session_types;
  }

  if (response.interaction_configuration) {
    const interactionConfigurationAdapter =
      INTERACTION_CONFIGURATION_ADAPTERS[response.interaction_configuration.interaction_mode as BookingQuestionInteractionMode];
    question.interactionConfiguration = interactionConfigurationAdapter(response.interaction_configuration);
  }

  return question;
}

function adaptCompositeInteractionConfiguration(response: InteractionConfigurationCompositeResponse): InteractionConfigurationComposite {
  return {
    interactionMode: response.interaction_mode as BookingQuestionInteractionMode.COMPOSITE_QUESTION,
    templateId: response.template_id,
    templateAttribute: response.template_attribute as CompositeQuestionTemplateAttribute,
    order: response.order,
  };
}

function adaptConditionalInteractionConfiguration(
  response: InteractionConfigurationConditionalResponse,
): InteractionConfigurationConditional {
  return {
    interactionMode: response.interaction_mode as BookingQuestionInteractionMode.CONDITIONAL_QUESTION,
    parentBookingQuestionId: response.parent_booking_question_id,
    parentTriggerAnswers: response.parent_trigger_answers,
  };
}

function adaptConfiguration(response: ConfigurationResponse): BookingQuestionConfiguration {
  return {
    nominativeTicket: response.nominative_ticket as BookingQuestionNominativeTicketConfiguration,
  };
}
