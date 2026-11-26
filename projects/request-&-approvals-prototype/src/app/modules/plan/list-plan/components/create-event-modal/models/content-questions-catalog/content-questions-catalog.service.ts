import { Injectable } from '@angular/core';

import { isContentCategoryId, type ContentCategory, type ContentCategoryId } from '../content-questions.model';
import { contentDescriptionQuestion } from './content-description.question';
import { contentCategoryIds, contentVerticalIds } from './content-questions-catalog.ids';
import { contentQuestionsCategories } from './content-questions-categories';

@Injectable({ providedIn: 'root' })
export class ContentQuestionsCatalogService {
  readonly catalog: readonly ContentCategory[] = contentQuestionsCategories;
  readonly categoryIds = contentCategoryIds;
  readonly descriptionQuestion = contentDescriptionQuestion;
  readonly verticalIds = contentVerticalIds;

  readonly #categoriesById: ReadonlyMap<ContentCategoryId, ContentCategory>;

  constructor() {
    this.#categoriesById = new Map(contentQuestionsCategories.map(category => [category.id, category]));
  }

  findCategoryById(categoryId: string): ContentCategory | undefined {
    if (!isContentCategoryId(categoryId)) {
      return undefined;
    }

    return this.#categoriesById.get(categoryId);
  }
}
