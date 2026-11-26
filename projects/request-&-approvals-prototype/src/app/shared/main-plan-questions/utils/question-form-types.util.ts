import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';

import { QuestionFrequency } from '../models/question-frequency.enum';
import { QuestionWhen } from '../models/question-when.enum';

export interface QuestionFormContext {
  frequency: QuestionFrequency;
  when: QuestionWhen;
}

interface HiddenTypesRule {
  hidden: CustomerQuestionType[];
  matches: (context: QuestionFormContext) => boolean;
}

const HIDDEN_TYPE_RULES: HiddenTypesRule[] = [
  { hidden: [CustomerQuestionType.IMAGE], matches: context => context.when === QuestionWhen.POST_BOOKING },
];

export function getHiddenQuestionTypes(context: QuestionFormContext): CustomerQuestionType[] {
  return [...new Set(HIDDEN_TYPE_RULES.filter(rule => rule.matches(context)).flatMap(rule => rule.hidden))];
}
