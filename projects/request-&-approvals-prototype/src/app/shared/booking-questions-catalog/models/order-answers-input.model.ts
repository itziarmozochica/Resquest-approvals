import { ChoiceAdditionalQuestionAnswer } from './booking-question-answer.model';

export interface OrderAnswerInput {
  choiceAdditionalQuestionAnswers: ChoiceAdditionalQuestionAnswer[];
  questionId: string;
  sessionTypeId: number | null;
  value: string[];
}

export interface OrderTicketAnswerInput extends OrderAnswerInput {
  ticketIndex: number;
}

export interface OrderAnswersInput {
  answersPerOrder: OrderAnswerInput[];
  answersPerTicket: OrderTicketAnswerInput[][];
}
