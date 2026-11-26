import { ApiBookingQuestionItem } from '@fz-original/app/shared/booking-questions-catalog/models/booking-questions-catalog.api';

import { AutoAnswerFrom } from './auto-answer-from.enum';
import { QuestionAnswersAttachment } from './question-answers-attachment.enum';
import { QuestionFrequency } from './question-frequency.enum';
import { QuestionWhen } from './question-when.enum';

export interface ApiMainPlanQuestionItem {
  answers_attached_to: QuestionAnswersAttachment | null;
  auto_answer_from: AutoAnswerFrom | null;
  booking_question: ApiBookingQuestionItem;
  channel_ids: string[];
  default_values: string[] | null;
  frequency: QuestionFrequency;
  id: number;
  main_plan_id: number;
  optional: boolean;
  order: number | null;
  session_type_id: number | null;
  when: QuestionWhen;
}

export interface ApiFindMainPlanQuestionsData {
  items: ApiMainPlanQuestionItem[];
}

export interface ApiFindMainPlanQuestionsResponse {
  data: ApiFindMainPlanQuestionsData | null;
  error: { code: number; message: string } | null;
}

export interface ApiMainPlanQuestionRequest {
  answers_attached_to: QuestionAnswersAttachment | null;
  auto_answer_from: AutoAnswerFrom | null;
  channel_ids: string[];
  default_values: string[] | null;
  frequency: QuestionFrequency;
  optional: boolean;
  order: number | null;
  session_type_id: number | null;
  when: QuestionWhen;
}

export interface ApiMainPlanQuestionMutationData {
  main_plan_question_id: number;
}

export interface ApiMainPlanQuestionMutationResponse {
  data: ApiMainPlanQuestionMutationData | null;
  error: { code: number; message: string } | null;
}
