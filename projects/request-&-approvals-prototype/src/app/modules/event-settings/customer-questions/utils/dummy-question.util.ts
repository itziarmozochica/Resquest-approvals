import { CatalogCategory } from '@fz-original/app/shared/booking-questions-catalog/models/catalog-category.enum';
import { CustomerQuestionType } from '@fz-original/app/shared/booking-questions-catalog/models/customer-question-type.enum';
import {
  CustomerQuestion,
  CustomerQuestionCapabilities,
} from '@fz-original/app/shared/booking-questions-catalog/models/customer-question.model';
import { QuestionFrequency } from '@fz-original/app/shared/main-plan-questions/models/question-frequency.enum';
import { QuestionWhen } from '@fz-original/app/shared/main-plan-questions/models/question-when.enum';

import { MpqDisplay } from '../models/event-customer-questions-view.model';
import { toDisplay } from './build-mpq-sections.util';

export const DUMMY_QUESTION_ID = 0;

export interface DummyQuestionContext {
  frequency: QuestionFrequency;
  mainPlanId: number;
  placeholderDescription: string;
  placeholderTitle: string;
  question: CustomerQuestion | null;
  type: CustomerQuestionType;
  when: QuestionWhen;
}

const INERT_CAPABILITIES: CustomerQuestionCapabilities = {
  canAssign: false,
  canDelete: false,
  canModify: false,
  canViewAnswers: false,
  canViewDetails: false,
};

export function buildDummyQuestionDisplay(context: DummyQuestionContext): MpqDisplay {
  const bookingQuestion: CustomerQuestion = context.question
    ? { ...context.question, allowedCapabilities: INERT_CAPABILITIES }
    : {
        allowedCapabilities: INERT_CAPABILITIES,
        catalogCategory: CatalogCategory.PARTNER_OWNED,
        choices: null,
        description: context.placeholderDescription,
        id: String(DUMMY_QUESTION_ID),
        title: context.placeholderTitle,
        type: context.type,
        validationRegex: null,
      };

  return toDisplay(
    {
      answersAttachedTo: null,
      autoAnswerFrom: null,
      bookingQuestion,
      channelIds: [],
      defaultValues: null,
      frequency: context.frequency,
      id: DUMMY_QUESTION_ID,
      mainPlanId: context.mainPlanId,
      optional: true,
      order: null,
      sessionTypeId: null,
      when: context.when,
    },
    false,
  );
}
