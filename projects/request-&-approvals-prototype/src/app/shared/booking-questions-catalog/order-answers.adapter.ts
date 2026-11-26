import { inject, Injectable } from '@angular/core';

import { BookingQuestionAnswersAdapter } from './booking-question-answers.adapter';
import { BookingQuestionAnswer } from './models/booking-question-answer.model';
import { OrderAnswerInput, OrderAnswersInput, OrderTicketAnswerInput } from './models/order-answers-input.model';
import {
  ApiGetOrderAnswersResponse,
  ApiModifyOrderAnswerPerOrder,
  ApiModifyOrderAnswerPerTicket,
  ApiModifyOrderAnswersRequest,
} from './models/order-answers.api';

@Injectable({
  providedIn: 'root',
})
export class OrderAnswersAdapter {
  readonly #answersAdapter = inject(BookingQuestionAnswersAdapter);

  fromApiList(response: ApiGetOrderAnswersResponse): BookingQuestionAnswer[] {
    return (response.data?.items ?? []).map(item => this.#answersAdapter.fromApiItem(item));
  }

  toApiModifyRequest(input: OrderAnswersInput): ApiModifyOrderAnswersRequest {
    return {
      answers_per_order: input.answersPerOrder.map(answer => this.#toApiAnswer(answer)),
      answers_per_ticket: input.answersPerTicket.map(ticketAnswers => ticketAnswers.map(answer => this.#toApiTicketAnswer(answer))),
    };
  }

  #toApiAnswer(answer: OrderAnswerInput): ApiModifyOrderAnswerPerOrder {
    return {
      answer: answer.value,
      choice_additional_question_answers: answer.choiceAdditionalQuestionAnswers.length
        ? answer.choiceAdditionalQuestionAnswers.map(entry => ({ answer: entry.answer, choice: entry.choice }))
        : null,
      question_id: answer.questionId,
      session_type_id: answer.sessionTypeId,
    };
  }

  #toApiTicketAnswer(answer: OrderTicketAnswerInput): ApiModifyOrderAnswerPerTicket {
    return { ...this.#toApiAnswer(answer), ticket_index: answer.ticketIndex };
  }
}
