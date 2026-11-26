import { BookingQuestionChoice } from '../models/booking-question-choice';
import { BookingQuestionsChoiceResponse } from '../models/responses/booking-questions-choice.response';

export function adaptChoicesData(choicesData: Array<BookingQuestionsChoiceResponse>): Array<BookingQuestionChoice> {
  return choicesData.map(choice => {
    return {
      value: choice.value,
      label: choice.label,
      additionalQuestion: choice.additional_question,
      order: choice.order,
    } as BookingQuestionChoice;
  });
}
