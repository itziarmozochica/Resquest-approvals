import { ConfigurationResponse } from '@fz-original/app/shared/booking-questions/models/responses/configuration.response';

import { BookingQuestionRange } from '../booking-question-range';
import { BookingQuestionSessionTypes } from '../booking-question-session-types';
import { BookingQuestionType } from '../booking-question-type';
import { BookingQuestionWhen } from '../booking-question-when';
import { BookingQuestionsChoiceResponse } from './booking-questions-choice.response';
import { InteractionConfigurationCompositeResponse } from './interaction-configuration-composite.response';

export interface BookingQuestionsResponse {
  question_id: string;
  label: string;
  message: string;
  type: BookingQuestionType;
  choices: string[];
  choices_data?: BookingQuestionsChoiceResponse[];
  optional: boolean;
  frequency: 'per_order' | 'per_ticket';
  when: BookingQuestionWhen;
  default_values: string[];
  auto_answer_from: string;
  visible_in_fever_zone?: boolean;
  range?: BookingQuestionRange;
  session_types?: BookingQuestionSessionTypes[];
  main_plan_id: number;
  session_type_id?: number;
  interaction_configuration?: InteractionConfigurationCompositeResponse;
  configuration?: ConfigurationResponse | null;
}

export interface BookingQuestionsWithAnswersResponse extends BookingQuestionsResponse {
  answer: string[];
}

export interface B2bBookingQuestionsEnvelopeResponse {
  data: BookingQuestionsResponse[] | null;
  error: { code: number; message: string } | null;
}

export interface B2bAnswersGroupEnvelopeResponse {
  data: { answers_group_id: string } | null;
  error: { code: number; message: string } | null;
}
