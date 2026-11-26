import { ValidationErrors } from '@angular/forms';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

import { ChoiceAdditionalQuestionAnswer } from '../../../models/booking-question-answer.model';
import { CustomerQuestionChoice } from '../../../models/customer-question.model';
import { QuestionAnswerValue } from '../../../models/question-answer-value.model';

/** The choices a picker may offer, dropping the ones whose follow-up the caller cannot collect. */
export function selectableChoices(choices: CustomerQuestionChoice[], withAdditionalQuestions: boolean): CustomerQuestionChoice[] {
  return withAdditionalQuestions ? choices : choices.filter(choice => !choice.includeAdditionalQuestion);
}

/**
 * The offered choices, followed by any answer that is not among them. An answer can outlive the
 * choice it was picked from, and a picker that dropped it would read as if it had never been given.
 */
export function toChoiceOptions(choices: CustomerQuestionChoice[], values: string[]): SelectOption[] {
  const offered = choices.map(choice => ({ id: choice.label, title: choice.label }));
  const known = new Set(offered.map(option => String(option.id)));
  const answered = values.filter(value => value.trim() !== '' && !known.has(value)).map(value => ({ id: value, title: value }));

  return [...offered, ...answered];
}

export function selectedChoiceOptions(options: SelectOption[], values: string[]): SelectOption[] {
  const selected = new Set(values);

  return options.filter(option => selected.has(String(option.id)));
}

/**
 * The follow-ups the answered choices ask for, each carrying whatever was written for it, and then
 * the ones the question stopped asking: a follow-up outlives its choice the same way an answer does.
 */
export function toFollowUps(choices: CustomerQuestionChoice[], answer: QuestionAnswerValue): ChoiceAdditionalQuestionAnswer[] {
  const selected = new Set(answer.value);
  const answers = new Map(answer.additionalAnswers.map(entry => [entry.choice, entry.answer]));

  const asked = choices
    .filter(choice => choice.includeAdditionalQuestion && selected.has(choice.label))
    .map(choice => ({ answer: answers.get(choice.label) ?? '', choice: choice.label }));
  const stillAsked = new Set(asked.map(entry => entry.choice));

  return [...asked, ...answer.additionalAnswers.filter(entry => selected.has(entry.choice) && !stillAsked.has(entry.choice))];
}

/**
 * A choice that asks a follow-up is unanswerable where follow-ups are not collected, so picking it
 * is an invalid answer rather than an incomplete one.
 */
export function unsavableFollowUpChoiceError(choices: CustomerQuestionChoice[], values: string[]): ValidationErrors | null {
  const asksFollowUp = new Set(choices.filter(choice => choice.includeAdditionalQuestion).map(choice => choice.label));

  return values.some(value => asksFollowUp.has(value)) ? { invalidChoice: true } : null;
}
