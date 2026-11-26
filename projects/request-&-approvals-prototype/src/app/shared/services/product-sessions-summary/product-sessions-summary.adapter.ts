import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import {
  Price,
  ProductSession,
  ProductSessionsSummaryData,
  SessionType,
  TicketsAllowed,
} from '../../models/product-sessions-summary/product-sessions-summary-response.model';
import {
  PriceDTO,
  ProductSessionsDataDTO,
  ProductSessionSummaryDTO,
  ProductSessionTypeDTO,
  TicketsAllowedDTO,
} from './product-sessions-summary.dto';

@Injectable({
  providedIn: 'root',
})
export class ProductSessionsSummaryAdapter
  implements AdapterInterface<BaseResponse<ProductSessionsSummaryData>, BaseResponse<ProductSessionsDataDTO>>
{
  fromApi(data: BaseResponse<ProductSessionsDataDTO>): BaseResponse<ProductSessionsSummaryData> {
    if (data.error) {
      return new BaseResponse<ProductSessionsSummaryData>(null, this.#getError(data.error));
    }

    if (!data.data) {
      return new BaseResponse<ProductSessionsSummaryData>(null, null);
    }

    const transformedData: ProductSessionsSummaryData = {
      next_page: data.data.next_page,
      sessions_by_id: this.#transformSessionsById(data.data.sessions_by_id),
      sku_or_gtin_to_session_id: { ...data.data.sku_or_gtin_to_session_id },
    };

    return new BaseResponse<ProductSessionsSummaryData>(transformedData, null);
  }

  #getError(error: BaseErrorResponse | any): BaseErrorResponse | null {
    if (!error) {
      return null;
    }
    return {
      code: error.code,
      message: error.message || `errors.${error.code}`,
      error: error.error,
      errorCode: error.errorCode,
    };
  }

  #transformPrice(priceDTO: PriceDTO): Price {
    return {
      amount: priceDTO.amount,
      currency: priceDTO.currency,
    };
  }

  #transformProductSession(sessionId: number, sessionDTO: ProductSessionSummaryDTO): ProductSession {
    return {
      id: sessionId,
      available_tickets: sessionDTO.available_tickets,
      end_date: sessionDTO.end_date,
      is_hidden: sessionDTO.is_hidden,
      is_searchable: sessionDTO.is_searchable ?? true,
      main_plan_id: sessionDTO.main_plan_id,
      price: this.#transformPrice(sessionDTO.price),
      purchasable_until_date: sessionDTO.purchasable_until_date,
      sellable: sessionDTO.sellable,
      session_type: this.#transformSessionType(sessionDTO.session_type),
      start_date: sessionDTO.start_date,
      surcharge_per_ticket: this.#transformPrice(sessionDTO.surcharge_per_ticket),
      tickets_allowed_per_booking: this.#transformTicketsAllowed(sessionDTO.tickets_allowed_per_booking),
      title: sessionDTO.title,
      gtin: sessionDTO.gtin ?? null,
      sku: sessionDTO.sku ?? null,
    };
  }

  #transformSessionType(sessionTypeDTO: ProductSessionTypeDTO): SessionType {
    return {
      allowed_num_tickets: this.#transformTicketsAllowed(sessionTypeDTO.allowed_num_tickets),
      id: sessionTypeDTO.id,
      label: sessionTypeDTO.label,
    };
  }

  #transformSessionsById(sessionsById: { [sessionId: string]: ProductSessionSummaryDTO }): { [sessionId: string]: ProductSession } {
    const transformedSessions: { [sessionId: string]: ProductSession } = {};

    for (const [sessionId, sessionDTO] of Object.entries(sessionsById)) {
      transformedSessions[sessionId] = this.#transformProductSession(parseInt(sessionId), sessionDTO);
    }

    return transformedSessions;
  }

  #transformTicketsAllowed(ticketsAllowedDTO: TicketsAllowedDTO): TicketsAllowed {
    return {
      maximum: ticketsAllowedDTO.maximum,
      minimum: ticketsAllowedDTO.minimum,
    };
  }
}
