import { CustomerQuestionType } from './customer-question-type.enum';

export interface CustomerQuestionChoiceInput {
  additionalQuestionMessage: string | null;
  includeAdditionalQuestion: boolean;
  label: string;
  order: number | null;
}

export interface CustomerQuestionInput {
  choices: CustomerQuestionChoiceInput[] | null;
  description: string;
  title: string;
  type: CustomerQuestionType;
  validationRegex: string | null;
}
