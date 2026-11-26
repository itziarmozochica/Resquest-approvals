import { CustomerQuestionChoiceInput } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-input.model';
import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import { CustomerQuestion } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { AutoAnswerFrom } from '@fz-original/app/shared/main-plan-questions/models/auto-answer-from.enum';
import { QuestionAnswersAttachment } from '@fz-original/app/shared/main-plan-questions/models/question-answers-attachment.enum';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';

import { PartnerAccessLevel } from './partner-access-level.enum';

export type QuestionSidepanelMode = 'create' | 'edit' | 'view';

export interface MainPlanQuestionSidepanelInfo {
  answersAttachedTo: QuestionAnswersAttachment | null;
  autoAnswerFrom: AutoAnswerFrom | null;
  channelOptions: SelectOption[];
  defaultValues: string[] | null;
  frequency: QuestionFrequency;
  mainPlanId: number;
  mode: QuestionSidepanelMode;
  optional: boolean;
  order: number | null;
  partnerId: number;
  selectedChannelIds: string[];
  sessionTypeId: number | null;
  sessionTypeOptions: SelectOption[];
  when: QuestionWhen;
  mainPlanQuestionId?: number;
}

export interface QuestionSidepanelInfo {
  mode: QuestionSidepanelMode;
  type: CustomerQuestionType;
  customerQuestion?: CustomerQuestion;
}

export interface CustomerQuestionSidepanelData {
  question: QuestionSidepanelInfo;
  mainPlanQuestion?: MainPlanQuestionSidepanelInfo;
}

export interface QuestionBaseValue {
  choices: CustomerQuestionChoiceInput[] | null;
  description: string;
  title: string;
  type: CustomerQuestionType;
}

export interface QuestionAdditionalValue {
  originalPartnerAccessLevel: PartnerAccessLevel;
  partnerAccessLevel: PartnerAccessLevel | null;
  validationRegex: string | null;
}
