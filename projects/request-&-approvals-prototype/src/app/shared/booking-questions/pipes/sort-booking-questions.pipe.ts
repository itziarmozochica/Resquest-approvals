import { Pipe, PipeTransform } from '@angular/core';

import { BookingQuestion } from '../models';
import { BookingQuestionElementType } from '../models/booking-question-element-type';
import { BookingQuestionInteractionMode } from '../models/booking-question-interaction-mode';
import { CompositeBookingQuestion } from '../models/composite-booking-question';
import { InteractionConfigurationComposite } from '../models/interaction-configuration-composite';
import { SingleBookingQuestion } from '../models/single-booking-question';

type CompositeQuestionsGroupType = Record<string, BookingQuestion[]>;

type InitialCompositeIndexesType = Record<string, number>;

type CompositeQuestionsDataType = {
  compositeQuestionsGroup: CompositeQuestionsGroupType;
  initialCompositeIndexes: InitialCompositeIndexesType;
  regularQuestions: BookingQuestion[];
};

@Pipe({
  standalone: true,
  name: 'sortBookingQuestions',
})
export class SortBookingQuestionsPipe implements PipeTransform {
  transform(bookingQuestions: BookingQuestion[] | null): (SingleBookingQuestion | CompositeBookingQuestion)[] {
    if (!bookingQuestions || !Array.isArray(bookingQuestions)) {
      return [];
    }

    const { regularQuestions, compositeQuestionsGroup, initialCompositeIndexes } = this.#groupCompositeQuestions(bookingQuestions);

    const orderedCompositeQuestions: CompositeQuestionsGroupType = this.#orderCompositeQuestionsInternally(compositeQuestionsGroup);

    return this.#mergeQuestionsWithOriginalOrder(regularQuestions, orderedCompositeQuestions, initialCompositeIndexes);
  }

  #getInternalTemplateOrder(bookingQuestion: BookingQuestion): number {
    return (bookingQuestion?.interactionConfiguration as InteractionConfigurationComposite)?.order ?? 0;
  }

  #getIsCompositeQuestion(bookingQuestion: BookingQuestion): boolean {
    return !!(bookingQuestion?.interactionConfiguration?.interactionMode === BookingQuestionInteractionMode.COMPOSITE_QUESTION);
  }

  #getTemplateId(bookingQuestion: BookingQuestion): string | null {
    return (bookingQuestion?.interactionConfiguration as InteractionConfigurationComposite)?.templateId ?? null;
  }

  #groupCompositeQuestions(bookingQuestions: BookingQuestion[]): CompositeQuestionsDataType {
    const regularQuestions: BookingQuestion[] = [];
    const compositeQuestionsGroup: CompositeQuestionsGroupType = {};
    const initialCompositeIndexes: InitialCompositeIndexesType = {};

    bookingQuestions.forEach((question, index) => {
      const templateId: string | null = this.#getTemplateId(question);
      const isCompositeInteractionMode: boolean = this.#getIsCompositeQuestion(question);

      if (isCompositeInteractionMode && templateId) {
        if (!compositeQuestionsGroup[templateId]) {
          compositeQuestionsGroup[templateId] = [];
          initialCompositeIndexes[templateId] = index;
        }
        compositeQuestionsGroup[templateId].push(question);
      } else {
        regularQuestions.push(question);
      }
    });

    return {
      compositeQuestionsGroup,
      initialCompositeIndexes,
      regularQuestions,
    };
  }

  #mergeQuestionsWithOriginalOrder(
    regularQuestions: BookingQuestion[],
    compositeQuestionsGroup: CompositeQuestionsGroupType,
    initialCompositeIndexes: InitialCompositeIndexesType,
  ): (SingleBookingQuestion | CompositeBookingQuestion)[] {
    const orderedQuestions: (SingleBookingQuestion | CompositeBookingQuestion)[] = regularQuestions.map(question => ({
      id: question.id,
      type: BookingQuestionElementType.SINGLE,
      question,
    }));
    for (const templateId in compositeQuestionsGroup) {
      const compositeQuestion = compositeQuestionsGroup[templateId];
      orderedQuestions.splice(initialCompositeIndexes[templateId], 0, {
        id: templateId,
        type: BookingQuestionElementType.COMPOSITE,
        questions: compositeQuestion,
      });
    }
    return orderedQuestions;
  }

  #orderCompositeQuestionsInternally(compositeQuestionsGroup: CompositeQuestionsGroupType): CompositeQuestionsGroupType {
    for (const templateId in compositeQuestionsGroup) {
      if (compositeQuestionsGroup[templateId]) {
        compositeQuestionsGroup[templateId].sort(
          (questionA, questionB) => this.#getInternalTemplateOrder(questionA) - this.#getInternalTemplateOrder(questionB),
        );
      }
    }

    return compositeQuestionsGroup;
  }
}
