import { BookingQuestion } from './booking-question';

export interface ChoiceAdditionalQuestionAnswer {
  choice: unknown;
  answer: unknown;
}

export interface BookingQuestionAnswer {
  questionId: string;
  value: unknown;
  displayValue: unknown;
  choiceAdditionalQuestionAnswers?: Array<ChoiceAdditionalQuestionAnswer> | null;
}

export interface BookingQuestionTicketAnswer extends BookingQuestionAnswer {
  ticketIndex: number;
  sessionTypeId?: number;
}

export interface BookingQuestionAnswersItem<T extends BookingQuestionAnswer> {
  question: BookingQuestion;
  answer: T;
}

export interface BookingQuestionAnswers {
  perOrder: Array<BookingQuestionAnswersItem<BookingQuestionAnswer>>;
  perTicket: Array<Array<BookingQuestionAnswersItem<BookingQuestionTicketAnswer>>>;
}
