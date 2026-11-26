import { InjectionToken, Type } from '@angular/core';

import { BookingQuestionType } from '../../models';
import { QuestionItemComponent } from './question-item.component';

export interface QuestionItemComponentType {
  questionType: BookingQuestionType;
  componentType: Type<QuestionItemComponent>;
}

/** Provided with `multi: true` by each question item module, so it resolves to an array. */
export const QUESTION_ITEM_COMPONENTS = new InjectionToken<QuestionItemComponentType[]>('QUESTION_ITEM_COMPONENTS');
