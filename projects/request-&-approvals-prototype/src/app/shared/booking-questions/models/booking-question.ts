import { BookingQuestionConfiguration } from '@fz-original/app/shared/booking-questions/models/booking-question-configuration';

import { BookingQuestionChoice } from './booking-question-choice';
import { BookingQuestionFrequency } from './booking-question-frequency';
import { BookingQuestionRange } from './booking-question-range';
import { BookingQuestionSessionTypes } from './booking-question-session-types';
import { BookingQuestionType } from './booking-question-type';
import { BookingQuestionWhen } from './booking-question-when';
import { InteractionConfiguration } from './interaction-configuration';

export interface BookingQuestion {
  choices?: Array<BookingQuestionChoice> | null;
  defaultValues?: Array<unknown>;
  formControlId?: string;
  frequency: BookingQuestionFrequency;
  id: string;
  interactionConfiguration?: InteractionConfiguration;
  label: string;
  mainPlanId?: number;
  message: string;
  optional: boolean;
  range?: BookingQuestionRange | null;
  sessionTypeId?: number;
  sessionTypes?: Array<BookingQuestionSessionTypes>;
  type: BookingQuestionType;
  visibleInFeverZone: boolean;
  when: BookingQuestionWhen;
  configuration?: BookingQuestionConfiguration | null;
}

export interface BookingQuestionWithAnswers extends BookingQuestion {
  answers: string[];
}
