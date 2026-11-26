import { CatalogCategory } from './catalog-category.enum';
import { CustomerQuestionType } from './customer-question-type.enum';

export interface CustomerQuestionsCatalogQuery {
  page: number;
  pageSize: number;
  assignableOnly?: boolean;
  catalogCategories?: CatalogCategory[] | null;
  label?: string | null;
  questionType?: CustomerQuestionType | null;
}
