import { inject, Injectable } from '@angular/core';

import { MainPlanQuestionsAdapter } from '@fz-original/app/shared/main-plan-questions/main-plan-questions.adapter';
import { OrderSummaryAdapter } from '@fz-original/app/shared/services/purchase/order-summary.adapter';

import {
  BookingQuestionAnswer,
  BookingQuestionAnswersPage,
  EMPTY_BOOKING_QUESTION_ANSWERS_PAGE,
} from './models/booking-question-answer.model';
import {
  ApiBookingQuestionAnswerItem,
  ApiFindBookingQuestionAnswersResponse,
  ApiModifyBookingQuestionAnswerRequest,
} from './models/booking-question-answers.api';

@Injectable({
  providedIn: 'root',
})
export class BookingQuestionAnswersAdapter {
  readonly #mainPlanQuestionsAdapter = inject(MainPlanQuestionsAdapter);
  readonly #orderSummaryAdapter = inject(OrderSummaryAdapter);

  fromApiItem(item: ApiBookingQuestionAnswerItem): BookingQuestionAnswer {
    return {
      choiceAdditionalQuestionAnswers: (item.choice_additional_question_answers ?? []).map(entry => ({
        answer: entry.answer,
        choice: entry.choice,
      })),
      file: item.file
        ? { expiresAt: item.file.expires_at, id: item.file.id, size: item.file.size, type: item.file.type, url: item.file.url }
        : null,
      id: item.id,
      mainPlanQuestion: item.main_plan_question ? this.#mainPlanQuestionsAdapter.fromApiItem(item.main_plan_question) : null,
      orderSummary: item.order_summary ? this.#orderSummaryAdapter.fromApi(item.order_summary) : null,
      ticketIndex: item.ticket_index,
      value: item.value,
    };
  }

  fromApiList(response: ApiFindBookingQuestionAnswersResponse): BookingQuestionAnswersPage {
    const data = response.data;
    if (!data) {
      return EMPTY_BOOKING_QUESTION_ANSWERS_PAGE;
    }

    return {
      items: data.items.map(item => this.fromApiItem(item)),
      page: this.#toPage(data.offset, data.limit),
      pageSize: data.limit,
      totalCount: data.total_count,
    };
  }

  toApiModifyRequest(value: string[]): ApiModifyBookingQuestionAnswerRequest {
    return { value };
  }

  #toPage(offset: number, limit: number): number {
    return limit > 0 ? Math.floor(offset / limit) + 1 : 1;
  }
}
