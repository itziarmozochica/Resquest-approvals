import { ValidationErrors } from '@angular/forms';

import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';

import { ChoiceAdditionalQuestionAnswer } from '../../../models/booking-question-answer.model';

const errorKeys: Record<string, string> = {
  answerNotClearable: 'questionAnswer.errors.notClearable',
  followUpRequired: 'questionAnswer.errors.followUpRequired',
  invalidAnswer: 'questionAnswer.errors.invalid',
  invalidChoice: 'questionAnswer.errors.choice',
  invalidDate: 'questionAnswer.errors.date',
  invalidEmail: 'questionAnswer.errors.email',
  invalidNumber: 'questionAnswer.errors.number',
  invalidPattern: 'questionAnswer.errors.pattern',
  invalidTel: 'questionAnswer.errors.tel',
  invalidTerms: 'questionAnswer.errors.terms',
  invalidTime: 'questionAnswer.errors.time',
  required: 'questionAnswer.errors.required',
  unexpectedFollowUp: 'questionAnswer.errors.unexpectedFollowUp',
};

export function buildAnswerErrorMessages(translate: (key: string) => string): IngtFormError[] {
  return Object.entries(errorKeys).map(([type, key]) => ({ message: translate(key), type }));
}

/** The same errors without the given keys, or null once nothing is left to report. */
export function withoutErrors(errors: ValidationErrors | null, keys: ReadonlySet<string>): ValidationErrors | null {
  if (!errors) {
    return null;
  }

  const own = Object.fromEntries(Object.entries(errors).filter(([key]) => !keys.has(key)));

  return Object.keys(own).length > 0 ? own : null;
}

/** The answer-wide follow-up error, narrowed to the one choice whose follow-up is actually blank. */
export function followUpRequiredError(
  errors: ValidationErrors | null,
  additionalAnswers: ChoiceAdditionalQuestionAnswer[],
  choice: string,
): ValidationErrors | null {
  if (!errors) {
    return null;
  }

  const answered = additionalAnswers.find(entry => entry.choice === choice)?.answer.trim() ?? '';

  return errors['followUpRequired'] && answered === '' ? { followUpRequired: true } : null;
}
