import { MainPlanQuestion } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question.model';
import { ValidationOrderSummary } from '@fz-original/app/shared/models/order/order-summary.model';

export interface ChoiceAdditionalQuestionAnswer {
  answer: string;
  choice: string;
}

/** The `url` is signed and expires at `expiresAt`, so it must not be cached nor persisted. */
export interface BookingQuestionAnswerFile {
  expiresAt: string;
  id: string;
  size: number;
  type: string;
  url: string;
}

export interface BookingQuestionAnswer {
  choiceAdditionalQuestionAnswers: ChoiceAdditionalQuestionAnswer[];
  file: BookingQuestionAnswerFile | null;
  id: number;
  mainPlanQuestion: MainPlanQuestion | null;
  orderSummary: ValidationOrderSummary | null;
  ticketIndex: number | null;
  value: string[];
}

export interface BookingQuestionAnswersPage {
  items: BookingQuestionAnswer[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export const EMPTY_BOOKING_QUESTION_ANSWERS_PAGE: BookingQuestionAnswersPage = { items: [], page: 1, pageSize: 0, totalCount: 0 };
