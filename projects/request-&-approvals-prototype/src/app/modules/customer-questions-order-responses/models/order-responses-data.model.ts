import { BookingQuestionAnswer } from '@fz-original/app/shared/booking-questions-catalog/models/booking-question-answer.model';
import { MainPlanQuestion } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';

export interface OrderResponsesData {
  answers: BookingQuestionAnswer[];
  mainPlanQuestions: MainPlanQuestion[];
  order: Order;
}
