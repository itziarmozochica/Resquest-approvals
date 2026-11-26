import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';

const TYPE_ICONS: Record<CustomerQuestionType, string> = {
  [CustomerQuestionType.CHECKBOX_WITH_TERMS]: 'square-check',
  [CustomerQuestionType.DATE]: 'calendar',
  [CustomerQuestionType.EMAIL]: 'envelope',
  [CustomerQuestionType.IMAGE]: 'image',
  [CustomerQuestionType.MULTIPLE_CHOICE]: 'check-double',
  [CustomerQuestionType.NAME]: 'user',
  [CustomerQuestionType.NUMBER]: 'circle-1',
  [CustomerQuestionType.SINGLE_CHOICE]: 'check',
  [CustomerQuestionType.TEL]: 'phone',
  [CustomerQuestionType.TEXT]: 'text',
  [CustomerQuestionType.TIME]: 'clock',
};

const TYPE_LABEL_KEYS: Record<CustomerQuestionType, string> = {
  [CustomerQuestionType.CHECKBOX_WITH_TERMS]: 'customerQuestionsCatalog.types.checkboxWithTerms',
  [CustomerQuestionType.DATE]: 'customerQuestionsCatalog.types.date',
  [CustomerQuestionType.EMAIL]: 'customerQuestionsCatalog.types.email',
  [CustomerQuestionType.IMAGE]: 'customerQuestionsCatalog.types.image',
  [CustomerQuestionType.MULTIPLE_CHOICE]: 'customerQuestionsCatalog.types.multipleChoice',
  [CustomerQuestionType.NAME]: 'customerQuestionsCatalog.types.name',
  [CustomerQuestionType.NUMBER]: 'customerQuestionsCatalog.types.number',
  [CustomerQuestionType.SINGLE_CHOICE]: 'customerQuestionsCatalog.types.singleChoice',
  [CustomerQuestionType.TEL]: 'customerQuestionsCatalog.types.tel',
  [CustomerQuestionType.TEXT]: 'customerQuestionsCatalog.types.text',
  [CustomerQuestionType.TIME]: 'customerQuestionsCatalog.types.time',
};

const ANSWER_FORMAT_EXAMPLE_KEY_BASE = 'customerQuestionsCatalog.sidepanel.answerFormat.examples';

/**
 * The example shown under the pattern field, per type. A type absent from this map takes no answer
 * format at all, so the two are declared together: the set of keys *is* the set of supported types.
 */
const ANSWER_FORMAT_EXAMPLE_KEYS: Partial<Record<CustomerQuestionType, string>> = {
  [CustomerQuestionType.EMAIL]: 'email',
  [CustomerQuestionType.NAME]: 'text',
  [CustomerQuestionType.NUMBER]: 'number',
  [CustomerQuestionType.TEL]: 'tel',
  [CustomerQuestionType.TEXT]: 'text',
};

export const CUSTOMER_QUESTION_TYPE_FILTER_OPTIONS: CustomerQuestionType[] = [
  CustomerQuestionType.TEXT,
  CustomerQuestionType.EMAIL,
  CustomerQuestionType.TEL,
  CustomerQuestionType.DATE,
  CustomerQuestionType.TIME,
  CustomerQuestionType.NUMBER,
  CustomerQuestionType.SINGLE_CHOICE,
  CustomerQuestionType.MULTIPLE_CHOICE,
  CustomerQuestionType.CHECKBOX_WITH_TERMS,
  CustomerQuestionType.IMAGE,
];

export function getCustomerQuestionTypeIcon(type: CustomerQuestionType): string {
  return TYPE_ICONS[type];
}

export function getCustomerQuestionTypeLabelKey(type: CustomerQuestionType): string {
  return TYPE_LABEL_KEYS[type];
}

export function isChoiceQuestionType(type: CustomerQuestionType): boolean {
  return type === CustomerQuestionType.SINGLE_CHOICE || type === CustomerQuestionType.MULTIPLE_CHOICE;
}

/**
 * The i18n key holding the example pattern for this type, and the one describing what it matches.
 * Only defined for the types that take an answer format.
 */
export function getAnswerFormatExampleKeys(type: CustomerQuestionType): { hint: string; pattern: string } | null {
  const example = ANSWER_FORMAT_EXAMPLE_KEYS[type];

  return example
    ? { hint: `${ANSWER_FORMAT_EXAMPLE_KEY_BASE}.${example}.hint`, pattern: `${ANSWER_FORMAT_EXAMPLE_KEY_BASE}.${example}.pattern` }
    : null;
}

/**
 * Whether an answer format can restrict this type's answers. Only the types the backend validates
 * as free text carry an answer worth restricting: for dates (`%Y-%m-%d`), times (`%H:%M`), choices
 * (one of the question's own choices), terms (the literal `true`) and images (the uploaded file url)
 * the value is already fixed, so a pattern could only reject a valid answer.
 */
export function supportsAnswerFormat(type: CustomerQuestionType): boolean {
  return ANSWER_FORMAT_EXAMPLE_KEYS[type] !== undefined;
}
