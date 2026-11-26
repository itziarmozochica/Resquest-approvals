import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { CustomerQuestionType } from '../models/customer-question-type.enum';
import { CustomerQuestion } from '../models/customer-question.model';
import { emptyQuestionAnswerValue, QuestionAnswerValue } from '../models/question-answer-value.model';

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const termsAccepted = 'true';
const telCountryPattern = /^[a-zA-Z]{2}$/;
const telLegacyPattern = /^\+?[()\-\s|0-9]+$/;
const telMaxDigits = 15;
const telMinDigits = 6;
const telPattern = /^\+[0-9]{1,3}\|[0-9]{6,14}$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Mirrors `booking_questions.domain.answer` so an edit is rejected in the field rather than by the
 * answers endpoint. The per-question content rules (Brazilian documents, minimum lengths) live in a
 * backend-side question map the API does not expose, so those still surface as a request error.
 */
export function questionAnswerValidator(question: CustomerQuestion, optional: boolean, clearable = true): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    // Safe: this validator is only ever attached to a control of this very shape.
    const answer = (control.value as QuestionAnswerValue | null) ?? emptyQuestionAnswerValue();
    const values = answer.value.filter(value => value.trim() !== '');

    if (values.length === 0) {
      if (!clearable) {
        return { answerNotClearable: true };
      }

      return optional ? null : { required: true };
    }

    return (
      typeError(question, values, answer.value) ?? additionalAnswersError(question, answer, optional) ?? patternError(question, values)
    );
  };
}

function additionalAnswersError(question: CustomerQuestion, answer: QuestionAnswerValue, optional: boolean): ValidationErrors | null {
  if (answer.value.length === 0 && answer.additionalAnswers.length > 0) {
    return { unexpectedFollowUp: true };
  }

  const withFollowUp = new Set((question.choices ?? []).filter(choice => choice.includeAdditionalQuestion).map(choice => choice.label));
  // A follow-up entry left blank is a follow-up nobody answered, whatever the payload carries.
  const answered = new Set(answer.additionalAnswers.filter(entry => entry.answer.trim() !== '').map(entry => entry.choice));

  for (const value of answer.value) {
    if (withFollowUp.has(value) && !answered.has(value) && !optional) {
      return { followUpRequired: true };
    }

    if (!withFollowUp.has(value) && answered.has(value)) {
      return { unexpectedFollowUp: true };
    }
  }

  return null;
}

function choiceLabels(question: CustomerQuestion): Set<string> {
  return new Set((question.choices ?? []).map(choice => choice.label));
}

function isCalendarDate(value: string): boolean {
  const match = datePattern.exec(value);
  if (!match) {
    return false;
  }

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function patternError(question: CustomerQuestion, values: string[]): ValidationErrors | null {
  if (question.validationRegex === null) {
    return null;
  }

  let pattern: RegExp;
  try {
    pattern = new RegExp(`^(?:${question.validationRegex})`);
  } catch {
    return null;
  }

  return pattern.test(values[0]) ? null : { invalidPattern: true };
}

function telError(values: string[]): ValidationErrors | null {
  if (values.length === 1) {
    const legacy = values[0].trim();
    const pipes = legacy.split('|').length - 1;
    const badPrefix = pipes > 1 || (pipes === 1 && !legacy.startsWith('+'));

    return !badPrefix && telLegacyPattern.test(legacy) ? null : { invalidTel: true };
  }

  if (values.length !== 2) {
    return { invalidTel: true };
  }

  const phone = values[0].trim();
  const digits = phone.replace(/[+|]/g, '').length;

  return telPattern.test(phone) && digits >= telMinDigits && digits <= telMaxDigits && telCountryPattern.test(values[1])
    ? null
    : { invalidTel: true };
}

/** `given` keeps the blanks: a phone's country slot is empty when this screen could not parse the number, and that is the answer. */
function typeError(question: CustomerQuestion, values: string[], given: string[]): ValidationErrors | null {
  switch (question.type) {
    case CustomerQuestionType.CHECKBOX_WITH_TERMS:
      return values.length === 1 && values[0].trim() === termsAccepted ? null : { invalidTerms: true };
    case CustomerQuestionType.DATE:
      return values.length === 1 && isCalendarDate(values[0]) ? null : { invalidDate: true };
    case CustomerQuestionType.EMAIL:
      return values.length === 1 && emailPattern.test(values[0]) ? null : { invalidEmail: true };
    case CustomerQuestionType.MULTIPLE_CHOICE:
      return values.every(value => choiceLabels(question).has(value)) ? null : { invalidChoice: true };
    case CustomerQuestionType.NUMBER:
      return values.length === 1 && Number.isFinite(Number(values[0])) ? null : { invalidNumber: true };
    case CustomerQuestionType.SINGLE_CHOICE:
      return values.length === 1 && choiceLabels(question).has(values[0]) ? null : { invalidChoice: true };
    case CustomerQuestionType.TEL:
      return telError(given);
    case CustomerQuestionType.TIME:
      return values.length === 1 && timePattern.test(values[0]) ? null : { invalidTime: true };
    default:
      return values.length === 1 ? null : { invalidAnswer: true };
  }
}
