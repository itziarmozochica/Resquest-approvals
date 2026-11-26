import { BookingQuestionAnswer } from '@fz-original/app/shared/booking-questions-catalog/models/booking-question-answer.model';
import { CustomerQuestion } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';
import { MainPlanQuestion } from '@fz-original/app/shared/main-plan-questions/models/main-plan-question.model';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';

export interface OrderResponseEntry {
  answer: BookingQuestionAnswer | null;
  key: string;
  mainPlanQuestion: MainPlanQuestion;
  position: number;
  question: CustomerQuestion;
  required: boolean;
  ticketIndex: number | null;
}

export interface OrderResponseTicketGroup {
  entries: OrderResponseEntry[];
  ticketIndex: number;
}

export interface OrderResponseFrequencyGroup {
  entries: OrderResponseEntry[];
  frequency: QuestionFrequency;
  tickets: OrderResponseTicketGroup[];
}

export interface OrderResponseSection {
  frequencies: OrderResponseFrequencyGroup[];
  hasQuestions: boolean;
  hasHiddenRequired: boolean;
  hasUnsavableImage: boolean;
  when: QuestionWhen;
}

export interface OrderResponsesView {
  answeredCount: number;
  questionCount: number;
  sections: OrderResponseSection[];
}
