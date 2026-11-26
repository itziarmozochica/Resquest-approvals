import { CustomerQuestionType } from '../models/customer-question-type.enum';

const readOnlyTypes = new Set<CustomerQuestionType>([CustomerQuestionType.CHECKBOX_WITH_TERMS, CustomerQuestionType.IMAGE]);

/** A photo and an accepted terms box are read-only wherever they appear: the answers endpoint takes neither back. */
export function isAnswerEditable(type: CustomerQuestionType): boolean {
  return !readOnlyTypes.has(type);
}
