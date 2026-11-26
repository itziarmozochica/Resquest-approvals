import { BookingAnswerAdditionalQuestionPayload } from '../models/booking-answer-additional-question-payload';
import { ChoiceAdditionalQuestionAnswer } from '../models/booking-question-answer';

export function adaptAdditionalQuestionAnswers(
  choiceAdditionalQuestionAnswer: Array<ChoiceAdditionalQuestionAnswer>,
): Array<BookingAnswerAdditionalQuestionPayload> | null {
  if (choiceAdditionalQuestionAnswer.length === 0) {
    return null;
  }

  return choiceAdditionalQuestionAnswer.map(addtionalQuestion => ({
    choice: addtionalQuestion.choice as string,
    answer: addtionalQuestion.answer as string,
  }));
}
