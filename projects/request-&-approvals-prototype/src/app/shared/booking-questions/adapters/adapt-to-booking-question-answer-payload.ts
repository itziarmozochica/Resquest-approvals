import { BookingAnswerFileMetadata } from '../models/booking-answer-file-metadata';
import { BookingAnswerPayload } from '../models/booking-answer-payload';
import { BookingQuestion } from '../models/booking-question';
import { BookingQuestionAnswer } from '../models/booking-question-answer';
import { adaptAdditionalQuestionAnswers } from './adapt-additional-question-answers';

export function adaptToBookingQuestionAnswerPayload(question: BookingQuestion, answer: BookingQuestionAnswer): BookingAnswerPayload {
  let answerValue: any;
  let filesMetadata: BookingAnswerFileMetadata | undefined;
  if (question.type === 'image' && answer.value instanceof File) {
    answerValue = [answer.value.name];
    filesMetadata = { name: answer.value.name, size: answer.value.size, type: answer.value.type };
  } else if (Array.isArray(answer.value)) {
    answerValue = answer.value;
  } else {
    answerValue = [answer.value];
  }

  const answerPayload: BookingAnswerPayload = {
    question_id: answer.questionId,
    answer: answerValue,
    session_type_id: question.sessionTypeId,
    ...(filesMetadata && { answer_file_metadata: filesMetadata }),
  };

  if (answer.choiceAdditionalQuestionAnswers) {
    answerPayload.choice_additional_question_answers = adaptAdditionalQuestionAnswers(answer.choiceAdditionalQuestionAnswers);
  }

  return answerPayload;
}
