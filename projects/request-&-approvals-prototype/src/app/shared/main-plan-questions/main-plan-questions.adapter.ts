import { inject, Injectable } from '@angular/core';

import { BookingQuestionsCatalogAdapter } from '@fz-original/app/shared/booking-questions-catalog/booking-questions-catalog.adapter';

import { MainPlanQuestionInput } from './models/main-plan-question-input.model';
import { MainPlanQuestion } from './models/main-plan-question.model';
import { ApiFindMainPlanQuestionsResponse, ApiMainPlanQuestionItem, ApiMainPlanQuestionRequest } from './models/main-plan-questions.api';

@Injectable({
  providedIn: 'root',
})
export class MainPlanQuestionsAdapter {
  readonly #bookingQuestionsAdapter = inject(BookingQuestionsCatalogAdapter);

  fromApiItem(item: ApiMainPlanQuestionItem): MainPlanQuestion {
    return this.#mapItem(item);
  }

  fromApiList(response: ApiFindMainPlanQuestionsResponse): MainPlanQuestion[] {
    const data = response.data;
    if (!data) {
      return [];
    }

    return data.items.map(item => this.#mapItem(item));
  }

  toApiRequest(input: MainPlanQuestionInput): ApiMainPlanQuestionRequest {
    return {
      answers_attached_to: input.answersAttachedTo,
      auto_answer_from: input.autoAnswerFrom,
      channel_ids: input.channelIds,
      default_values: input.defaultValues,
      frequency: input.frequency,
      optional: input.optional,
      order: input.order,
      session_type_id: input.sessionTypeId,
      when: input.when,
    };
  }

  #mapItem(item: ApiMainPlanQuestionItem): MainPlanQuestion {
    return {
      answersAttachedTo: item.answers_attached_to,
      autoAnswerFrom: item.auto_answer_from,
      bookingQuestion: this.#bookingQuestionsAdapter.fromApiItem(item.booking_question),
      channelIds: item.channel_ids,
      defaultValues: item.default_values,
      frequency: item.frequency,
      id: item.id,
      mainPlanId: item.main_plan_id,
      optional: item.optional,
      order: item.order,
      sessionTypeId: item.session_type_id,
      when: item.when,
    };
  }
}
