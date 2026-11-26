import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';

import { ApiBookingQuestionAnswerItem, ApiChoiceAdditionalQuestionAnswerItem } from './booking-question-answers.api';

export interface ApiGetOrderAnswersData {
  items: ApiBookingQuestionAnswerItem[];
}

export interface ApiGetOrderAnswersResponse {
  data: ApiGetOrderAnswersData | null;
  error: { code: number; message: string } | null;
}

export interface ApiModifyOrderAnswerPerOrder {
  answer: string[];
  choice_additional_question_answers: ApiChoiceAdditionalQuestionAnswerItem[] | null;
  question_id: string;
  session_type_id: number | null;
}

export interface ApiModifyOrderAnswerPerTicket extends ApiModifyOrderAnswerPerOrder {
  ticket_index: number;
}

export interface ApiModifyOrderAnswersRequest {
  answers_per_order: ApiModifyOrderAnswerPerOrder[];
  answers_per_ticket: ApiModifyOrderAnswerPerTicket[][];
}

export interface ApiModifyOrderAnswersData {
  order_id: number;
  when: QuestionWhen;
}

export interface ApiModifyOrderAnswersResponse {
  data: ApiModifyOrderAnswersData | null;
  error: { code: number; message: string } | null;
}
