import { ChoiceAdditionalQuestionAnswer } from './booking-question-answer.model';

export interface QuestionAnswerValue {
  additionalAnswers: ChoiceAdditionalQuestionAnswer[];
  value: string[];
}

/**
 * A fresh empty answer on every call. One shared constant would hand the same two arrays to every
 * form control and every signal, where a single `push` would reach all of them at once.
 */
export function emptyQuestionAnswerValue(): QuestionAnswerValue {
  return { additionalAnswers: [], value: [] };
}

/**
 * Whether two answers say the same thing, whatever their identity.
 *
 * Consumers routinely build this object in a template binding, which hands over a fresh identity on
 * every change detection run. Comparing by reference there would report a change that never
 * happened, and acting on it is what turns a render into a loop.
 */
export function isSameQuestionAnswerValue(left: QuestionAnswerValue, right: QuestionAnswerValue): boolean {
  return (
    left.value.length === right.value.length &&
    left.value.every((item, index) => item === right.value[index]) &&
    left.additionalAnswers.length === right.additionalAnswers.length &&
    left.additionalAnswers.every(
      (entry, index) => entry.choice === right.additionalAnswers[index].choice && entry.answer === right.additionalAnswers[index].answer,
    )
  );
}
