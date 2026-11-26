import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { Money } from '@fz-original/app/shared/models/money.model';
import { OrderPaymentLeg } from '@fz-original/app/shared/models/order/order-payment-leg.model';
import { OrderTransaction, OrderTransactionStatus } from '@fz-original/app/shared/models/order/order-transaction.model';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { catchError, map, Observable, throwError } from 'rxjs';

interface OrderPaymentDTO {
  id: string;
  paid_amount: number;
  payment_method: string;
  card_last4?: string | null;
  refunded_amount?: number | null;
}

interface OrderPaymentsDTO {
  currency: string;
  payments: OrderPaymentDTO[];
}

interface OrderTransactionDTO {
  amount: number;
  created_at: string;
  failure_category: string | null;
  id: string;
  payment_method: string;
  position: number;
  status: string;
  terminal_id: string | null;
}

interface OrderTransactionsDTO {
  currency: string;
  transactions: OrderTransactionDTO[];
}

const TRANSACTION_STATUS_BY_DTO_STATUS: Readonly<Record<string, OrderTransactionStatus>> = {
  canceled: 'cancelled',
  cancelled: 'cancelled',
  failed: 'failed',
  in_progress: 'in_progress',
  refunded: 'completed',
  success: 'completed',
};

@Injectable({
  providedIn: 'root',
})
export class OrderPaymentMethodsService {
  readonly #http = inject(HttpClient);

  getOrderPayments(partnerId: number, orderId: number): Observable<OrderPaymentLeg[]> {
    return this.#http
      .get<OrderPaymentsDTO>(this.#getOrderPaymentsUrl(partnerId, orderId), { context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true) })
      .pipe(
        map(dto => (dto.payments ?? []).map(payment => toOrderPaymentLeg(payment, dto.currency))),
        catchError((error: unknown) => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  getOrderTransactions(partnerId: number, orderId: number): Observable<OrderTransaction[]> {
    return this.#http
      .get<OrderTransactionsDTO>(`${this.#getOrderUrl(partnerId, orderId)}/transactions`, {
        context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true),
      })
      .pipe(
        map(dto =>
          (dto.transactions ?? []).flatMap(transaction => {
            const status = TRANSACTION_STATUS_BY_DTO_STATUS[transaction.status];
            return status ? [toOrderTransaction(transaction, status, dto.currency)] : [];
          }),
        ),
        catchError((error: unknown) => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  #getOrderPaymentsUrl(partnerId: number, orderId: number): string {
    return `${this.#getOrderUrl(partnerId, orderId)}/payments`;
  }

  #getOrderUrl(partnerId: number, orderId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/orders/${orderId}`;
  }
}

function toOrderPaymentLeg(dto: OrderPaymentDTO, currency: string): OrderPaymentLeg {
  return {
    cardLast4: dto.card_last4 ?? null,
    id: dto.id,
    method: dto.payment_method,
    paidAmount: new Money(dto.paid_amount, currency),
    refundedAmount: dto.refunded_amount == null ? null : new Money(dto.refunded_amount, currency),
  };
}

function toOrderTransaction(dto: OrderTransactionDTO, status: OrderTransactionStatus, currency: string): OrderTransaction {
  return {
    amount: new Money(dto.amount, currency),
    createdAt: dto.created_at,
    failureCategory: dto.failure_category ?? null,
    id: dto.id,
    method: dto.payment_method,
    position: dto.position,
    status,
    terminalId: dto.terminal_id ?? null,
  };
}
