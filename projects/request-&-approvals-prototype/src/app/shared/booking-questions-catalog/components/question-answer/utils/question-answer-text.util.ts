import { CustomerQuestionType } from '../../../models/customer-question-type.enum';
import { formatAnswerForReading } from '../../../utils/question-answer-display.util';
import { toTelAnswerValue, toTelInput } from '../../../utils/question-answer-tel.util';

/** What a text field shows: the stored answer while reading, the raw one once it can be edited. */
export function toTextInput(type: CustomerQuestionType, values: string[], editing: boolean, locale: string): string {
  if (!editing) {
    return formatAnswerForReading(type, values, locale);
  }

  return type === CustomerQuestionType.TEL ? toTelInput(values) : (values[0] ?? '');
}

/**
 * What a text field writes back. A phone keeps the country it was already given, so a number typed
 * without a prefix is not silently stripped of it. A phone this screen cannot parse is written as the
 * pair anyway, which the validator refuses: the one-element shape is what legacy clients sent, and
 * writing it here would mint new legacy answers.
 */
export function toTextValue(type: CustomerQuestionType, text: string, country: string): string[] {
  const trimmed = text.trim();
  if (type !== CustomerQuestionType.TEL) {
    return trimmed === '' ? [] : [trimmed];
  }

  return toTelAnswerValue(trimmed, country) ?? (trimmed === '' ? [] : [trimmed, country]);
}
