import { BookingQuestionsChoiceResponse } from '../models/responses/booking-questions-choice.response';
import { BookingQuestionsResponse } from '../models/responses/booking-questions.response';

export interface SelectionBookingQuestionResponse extends Omit<BookingQuestionsResponse, 'choices'> {
  choices: unknown;
}

interface UsableChoiceEntry {
  value: string;
  richChoice?: BookingQuestionsChoiceResponse;
}

export function normalizeSelectionBookingQuestionResponse(response: SelectionBookingQuestionResponse): BookingQuestionsResponse {
  const { choices, ...rest } = response;
  const richChoices = extractRichChoices(choices);

  if (richChoices !== null) {
    return {
      ...rest,
      choices: richChoices.map(choice => choice.value),
      choices_data: richChoices.map(adaptSelectionChoice),
    };
  }

  if (isStringArray(choices)) {
    return { ...rest, choices };
  }

  if (!Array.isArray(choices) || choices.length === 0) {
    return { ...rest, choices: [] };
  }

  return normalizeMixedChoices(rest, choices);
}

function extractRichChoices(choices: unknown): BookingQuestionsChoiceResponse[] | null {
  if (!Array.isArray(choices) || choices.length === 0 || !choices.every(isRichChoice)) {
    return null;
  }

  return choices;
}

function normalizeMixedChoices(rest: Omit<SelectionBookingQuestionResponse, 'choices'>, choices: unknown[]): BookingQuestionsResponse {
  const usableChoices = choices.flatMap(toUsableChoiceEntry);
  const choiceValues = usableChoices.map(entry => entry.value);
  // Partial choices_data is forbidden: adaptBookingQuestionResponse prefers choices_data
  // over choices and would drop string-only options.
  const richChoices = usableChoices.flatMap(entry => (entry.richChoice === undefined ? [] : [entry.richChoice]));

  if (richChoices.length !== usableChoices.length) {
    return { ...rest, choices: choiceValues };
  }

  return {
    ...rest,
    choices: choiceValues,
    choices_data: richChoices.map(adaptSelectionChoice),
  };
}

function toUsableChoiceEntry(choice: unknown): UsableChoiceEntry[] {
  if (isRichChoice(choice)) {
    return [{ value: choice.value, richChoice: choice }];
  }

  if (typeof choice === 'string') {
    return [{ value: choice }];
  }

  if (hasChoiceValue(choice)) {
    const value = toChoiceValue(choice.value);
    return value === null ? [] : [{ value }];
  }

  return [];
}

function isRichChoice(choice: unknown): choice is BookingQuestionsChoiceResponse {
  if (typeof choice !== 'object' || choice === null || !('label' in choice) || !('value' in choice)) {
    return false;
  }

  return typeof choice.value === 'string';
}

function hasChoiceValue(choice: unknown): choice is { value: unknown } {
  return typeof choice === 'object' && choice !== null && 'value' in choice;
}

/** `choices` is declared `string[]`, so only scalars that render as a real option qualify. */
function toChoiceValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
}

function isStringArray(choices: unknown): choices is string[] {
  return Array.isArray(choices) && choices.every(choice => typeof choice === 'string');
}

// Deliberate field whitelist: only cart-compatible choice fields are forwarded from the wire shape.
function adaptSelectionChoice(choice: BookingQuestionsChoiceResponse): BookingQuestionsChoiceResponse {
  return {
    value: choice.value,
    label: choice.label,
    additional_question: choice.additional_question,
    order: choice.order,
  };
}
