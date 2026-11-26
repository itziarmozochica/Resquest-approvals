import { Injectable } from '@angular/core';

import {
  ApiBookingQuestionCapabilities,
  ApiBookingQuestionChoice,
  ApiBookingQuestionChoiceInput,
  ApiBookingQuestionItem,
  ApiCreateBookingQuestionRequest,
  ApiFindBookingQuestionsResponse,
  ApiUpdateBookingQuestionRequest,
} from './models/booking-questions-catalog.api';
import { CustomerQuestionChoiceInput, CustomerQuestionInput } from './models/customer-question-input.model';
import {
  CustomerQuestion,
  CustomerQuestionCapabilities,
  CustomerQuestionChoice,
  CustomerQuestionsPage,
  EMPTY_CUSTOMER_QUESTIONS_PAGE,
} from './models/customer-question.model';

@Injectable({
  providedIn: 'root',
})
export class BookingQuestionsCatalogAdapter {
  fromApiCapabilities(capabilities: ApiBookingQuestionCapabilities): CustomerQuestionCapabilities {
    return this.#mapCapabilities(capabilities);
  }

  fromApiItem(item: ApiBookingQuestionItem): CustomerQuestion {
    return this.#mapItem(item);
  }

  fromApiList(response: ApiFindBookingQuestionsResponse): CustomerQuestionsPage {
    const data = response.data;
    if (!data) {
      return EMPTY_CUSTOMER_QUESTIONS_PAGE;
    }

    return {
      items: data.items.map(item => this.#mapItem(item)),
      page: this.#toPage(data.offset, data.limit),
      pageSize: data.limit,
      totalCount: data.total_count,
    };
  }

  toApiCapabilities(capabilities: CustomerQuestionCapabilities): ApiBookingQuestionCapabilities {
    return {
      can_assign: capabilities.canAssign,
      can_delete: capabilities.canDelete,
      can_modify: capabilities.canModify,
      can_view_answers: capabilities.canViewAnswers,
      can_view_details: capabilities.canViewDetails,
    };
  }

  toApiCreateRequest(question: CustomerQuestionInput): ApiCreateBookingQuestionRequest {
    return {
      choices: this.#toApiChoices(question.choices),
      label: question.title,
      message: question.description,
      type: question.type,
      validation_regex: question.validationRegex,
    };
  }

  toApiUpdateRequest(question: CustomerQuestionInput): ApiUpdateBookingQuestionRequest {
    return {
      choices: this.#toApiChoices(question.choices),
      label: question.title,
      message: question.description,
      validation_regex: question.validationRegex,
    };
  }

  #mapCapabilities(capabilities: ApiBookingQuestionCapabilities): CustomerQuestionCapabilities {
    return {
      canAssign: capabilities.can_assign,
      canDelete: capabilities.can_delete,
      canModify: capabilities.can_modify,
      canViewAnswers: capabilities.can_view_answers,
      canViewDetails: capabilities.can_view_details,
    };
  }

  #mapChoice(choice: ApiBookingQuestionChoice): CustomerQuestionChoice {
    return {
      additionalQuestionMessage: choice.additional_question_message,
      id: choice.id,
      includeAdditionalQuestion: choice.include_additional_question,
      label: choice.label,
      order: choice.order,
    };
  }

  #mapItem(item: ApiBookingQuestionItem): CustomerQuestion {
    return {
      allowedCapabilities: this.#mapCapabilities(item.allowed_capabilities),
      catalogCategory: item.catalog_category,
      choices: item.choices ? item.choices.map(choice => this.#mapChoice(choice)) : null,
      description: item.message,
      id: item.id,
      title: item.label,
      type: item.type,
      validationRegex: item.validation_regex,
    };
  }

  #toApiChoice(choice: CustomerQuestionChoiceInput): ApiBookingQuestionChoiceInput {
    return {
      additional_question_message: choice.additionalQuestionMessage,
      include_additional_question: choice.includeAdditionalQuestion,
      label: choice.label,
      order: choice.order,
    };
  }

  #toApiChoices(choices: CustomerQuestionChoiceInput[] | null): ApiBookingQuestionChoiceInput[] | null {
    return choices ? choices.map(choice => this.#toApiChoice(choice)) : null;
  }

  #toPage(offset: number, limit: number): number {
    return limit > 0 ? Math.floor(offset / limit) + 1 : 1;
  }
}
