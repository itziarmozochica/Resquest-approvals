import { CatalogCategory } from './catalog-category.enum';
import { CustomerQuestionType } from './customer-question-type.enum';

export interface CustomerQuestionCapabilities {
  canAssign: boolean;
  canDelete: boolean;
  canModify: boolean;
  canViewAnswers: boolean;
  canViewDetails: boolean;
}

export interface CustomerQuestionChoice {
  additionalQuestionMessage: string | null;
  id: string;
  includeAdditionalQuestion: boolean;
  label: string;
  order: number | null;
}

export interface CustomerQuestion {
  allowedCapabilities: CustomerQuestionCapabilities;
  catalogCategory: CatalogCategory;
  choices: CustomerQuestionChoice[] | null;
  description: string;
  id: string;
  title: string;
  type: CustomerQuestionType;
  validationRegex: string | null;
}

export interface CustomerQuestionsPage {
  items: CustomerQuestion[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export const EMPTY_CUSTOMER_QUESTIONS_PAGE: CustomerQuestionsPage = { items: [], page: 1, pageSize: 0, totalCount: 0 };
