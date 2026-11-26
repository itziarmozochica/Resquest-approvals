import { contentCategoryIds } from './content-questions-catalog/content-questions-catalog.ids';
import type { contentVerticalIds } from './content-questions-catalog/content-questions-catalog.ids';

export type ContentVerticalId = (typeof contentVerticalIds)[number];

export type ContentCategoryId = (typeof contentCategoryIds)[number];

export function isContentCategoryId(categoryId: string): categoryId is ContentCategoryId {
  return contentCategoryIds.some(id => id === categoryId);
}

export type ContentQuestionType =
  | 'single_select'
  | 'single_select_exact'
  | 'single_select_number'
  | 'multi_select'
  | 'multi_select_open'
  | 'open_text_single_select'
  | 'open_text_multi_select'
  | 'open_text'
  | 'rich_text'
  | 'structured_open_text'
  | 'two_numbers'
  | 'yes_no';

export type ContentQuestionOptionExtra = 'number' | 'text';

export interface ContentQuestionOption {
  key: string;
  extra?: ContentQuestionOptionExtra;
}

export type ContentQuestionCondition =
  | { kind: 'always' }
  | { kind: 'condition'; optionKey: string; questionKey: string }
  | { kind: 'never' };

export interface ContentQuestion {
  key: string;
  labelKey: string;
  requiredWhen: ContentQuestionCondition;
  type: ContentQuestionType;
  helpKey?: string;
  options?: ContentQuestionOption[];
}

export function contentQuestionOptionKeys(question: ContentQuestion): readonly string[] {
  return (question.options ?? []).map(option => option.key);
}

export interface ContentCategory {
  id: ContentCategoryId;
  labelKey: string;
  questions: ContentQuestion[];
  verticalId: ContentVerticalId;
}

export interface ContentSingleAnswer {
  option: string;
  extra?: string;
}

export interface ContentMultiAnswer {
  options: string[];
  extra?: string;
}

export interface ContentRangeAnswer {
  max: number | null;
  min: number | null;
}

export type ContentAnswer = string | ContentSingleAnswer | ContentMultiAnswer | ContentRangeAnswer;

export type ContentAnswerShape = 'multi' | 'range' | 'rich_text' | 'single' | 'text';

/** HTML description built from the selected category, question answers and free-text description. */
export type ContentQuestionsValue = string;
