import { BookingQuestionChoice } from '../models/booking-question-choice';

export function adaptToQuestionChoices(choices: Array<string>): Array<BookingQuestionChoice> | null {
  return choices.map(choice => {
    return {
      value: choice,
      label: choice,
      additionalQuestion: null,
      order: null,
    } as unknown as BookingQuestionChoice;
  });
}
