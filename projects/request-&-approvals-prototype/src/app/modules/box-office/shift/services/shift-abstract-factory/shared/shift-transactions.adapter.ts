import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../../../shared/models/base-response';
import { LinkPaginationResponse } from '../../../../../../shared/models/link-pagination-response';
import { Money } from '../../../../../../shared/models/money.model';
import {
  REFUNDING_SHIFT_TRANSACTION_ACTIONS,
  ShiftTransaction,
  ShiftTransactionAction,
  ShiftTransactionDTO,
  ShiftTransactionOrder,
  ShiftTransactionOrderDTO,
} from '../../../models/shift-transaction';
import { ShiftTransactionsQuery, ShiftTransactionsQueryDTO } from '../../../models/shift-transactions-query';

export type GetShiftTransactionsApiResponseBody = Pick<BaseResponse<Array<ShiftTransactionDTO>>, 'data' | 'error'>;
export type GetShiftTransactionsResponse = LinkPaginationResponse<Array<ShiftTransaction>>;
export type GetShiftTransactionsApiResponse = HttpResponse<GetShiftTransactionsApiResponseBody>;

@Injectable({
  providedIn: 'root',
})
export class ShiftTransactionsAdapter implements AdapterInterface<GetShiftTransactionsResponse, GetShiftTransactionsApiResponse> {
  fromApi({ body, headers }: GetShiftTransactionsApiResponse): GetShiftTransactionsResponse {
    return new LinkPaginationResponse<Array<ShiftTransaction>>(
      headers.get('Link') || '',
      this.#getData(body?.data ?? null),
      this.#getError(body?.error ?? null),
    );
  }

  toApi(query: ShiftTransactionsQuery): ShiftTransactionsQueryDTO {
    return {
      page: query.page,
      items_per_page: query.itemsPerPage,
    };
  }

  #getData(data: Array<ShiftTransactionDTO> | null): Array<ShiftTransaction> | null {
    return (
      data?.map(dto => {
        const amount = this.#signedAmount(dto.total.amount, dto.action);
        const orders = this.#getOrders(dto);

        return {
          action: dto.action,
          fullName: dto.full_name,
          orders,
          paymentMethod: dto.payment_method,
          paymentMethodName: dto.payment_method_name ?? null,
          placeTimezone: dto.place_timezone,
          ticketCount: dto.ticket_count,
          total: new Money(amount, dto.total.currency),
          transactionDate: new Date(dto.transaction_date),
        };
      }) ?? null
    );
  }

  #getOrders(dto: ShiftTransactionDTO): ShiftTransactionOrder[] {
    if (dto.orders?.length > 0) {
      return this.#mapOrders(dto.orders, dto.action);
    }

    const amount = this.#signedAmount(dto.total.amount, dto.action);

    return [
      {
        orderId: dto.order_id,
        planDate: new Date(dto.plan_date),
        planName: dto.plan_name,
        ticketCount: dto.ticket_count,
        total: new Money(amount, dto.total.currency),
      },
    ];
  }

  #getError(data: BaseErrorResponse | null): BaseErrorResponse | null {
    return data ? { code: data.code, message: `errors.${data.code}` } : null;
  }

  #mapOrders(orders: ShiftTransactionOrderDTO[], action: ShiftTransactionAction): ShiftTransactionOrder[] {
    return orders.map(order => {
      const amount = this.#signedAmount(order.total.amount, action);

      return {
        orderId: order.order_id,
        planDate: new Date(order.plan_date),
        planName: order.plan_name,
        ticketCount: order.ticket_count,
        total: new Money(amount, order.total.currency),
      };
    });
  }

  #signedAmount(amount: number, action: ShiftTransactionAction): number {
    const absAmount = Math.abs(amount);

    return REFUNDING_SHIFT_TRANSACTION_ACTIONS.includes(action) ? -absAmount : absAmount;
  }
}
