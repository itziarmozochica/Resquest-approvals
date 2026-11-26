import { ApiMainPlanQuestionItem } from '@fz-original/app/shared/main-plan-questions/models/main-plan-questions.api';
import { OrderSummaryDTO } from '@fz-original/app/shared/services/purchase/models/order-summary.dto';

export interface ApiChoiceAdditionalQuestionAnswerItem {
  answer: string;
  choice: string;
}

export interface ApiBookingQuestionAnswerFileItem {
  expires_at: string;
  id: string;
  size: number;
  type: string;
  url: string;
}

export interface ApiBookingQuestionAnswerItem {
  choice_additional_question_answers: ApiChoiceAdditionalQuestionAnswerItem[] | null;
  file: ApiBookingQuestionAnswerFileItem | null;
  id: number;
  main_plan_question: ApiMainPlanQuestionItem | null;
  order_summary: OrderSummaryDTO | null;
  ticket_index: number | null;
  value: string[];
}

export interface ApiFindBookingQuestionAnswersData {
  items: ApiBookingQuestionAnswerItem[];
  limit: number;
  offset: number;
  total_count: number;
}

export interface ApiFindBookingQuestionAnswersResponse {
  data: ApiFindBookingQuestionAnswersData | null;
  error: { code: number; message: string } | null;
}

export interface ApiModifyBookingQuestionAnswerRequest {
  value: string[];
}

export interface ApiModifyBookingQuestionAnswerData {
  answer_id: number;
}

export interface ApiModifyBookingQuestionAnswerResponse {
  data: ApiModifyBookingQuestionAnswerData | null;
  error: { code: number; message: string } | null;
}
