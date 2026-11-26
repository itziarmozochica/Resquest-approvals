import { ChoiceAdditionalQuestionAnswer } from './booking-question-answer';

export interface BookingQuestionChoiceForm {
  choices: Array<string>;
  additionalQuestions?: Array<ChoiceAdditionalQuestionAnswer>;
}
