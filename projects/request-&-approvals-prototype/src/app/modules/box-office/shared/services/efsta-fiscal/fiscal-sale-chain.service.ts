import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { PurchaseService } from '@fz-original/app/shared/services/purchase/purchase.service';
import { catchError, defer, map, Observable, of, switchMap, throwError } from 'rxjs';

import { FiscalTransactionApiService, FiscalTransactionResponse, FiscalTransactionState } from './fiscal-transaction-api.service';

const maxRescheduleChainLength = 10;

export interface ChainFiscalSale {
  orderId: number;
  sale: FiscalTransactionResponse;
}

export class FiscalSaleChainError extends Error {
  override name = 'FiscalSaleChainError';
}

export class PendingFiscalSaleError extends FiscalSaleChainError {
  override name = 'PendingFiscalSaleError';
}

const signedFiscalTransactionStates: ReadonlyArray<FiscalTransactionState> = ['COMPLETED', 'HEALED'];

const saleOperationTypes: ReadonlyArray<string> = ['SALE', 'Vente'];

function isOwnSale(transaction: FiscalTransactionResponse | null): transaction is FiscalTransactionResponse {
  return transaction?.operation_type != null && saleOperationTypes.includes(transaction.operation_type);
}

function isSignedWithFiscalNumber(transaction: FiscalTransactionResponse): boolean {
  return signedFiscalTransactionStates.includes(transaction.state) && (transaction.fiscal_number?.trim().length ?? 0) > 0;
}

function isNotFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound;
}

@Injectable({
  providedIn: 'root',
})
export class FiscalSaleChainService {
  readonly #fiscalTransactionApiService = inject(FiscalTransactionApiService);
  readonly #purchaseService = inject(PurchaseService);

  findFiscalSale(partnerId: number, orderId: number, sourceRescheduleOrderId: number | undefined): Observable<ChainFiscalSale | null> {
    return this.#findInChain(partnerId, orderId, of(sourceRescheduleOrderId), []);
  }

  #findInChain(
    partnerId: number,
    orderId: number,
    sourceRescheduleOrderId$: Observable<number | undefined>,
    visitedOrderIds: readonly number[],
  ): Observable<ChainFiscalSale | null> {
    if (visitedOrderIds.includes(orderId)) {
      return throwError(() => new FiscalSaleChainError(`reschedule chain loops back to order ${orderId}`));
    }
    if (visitedOrderIds.length >= maxRescheduleChainLength) {
      return throwError(() => new FiscalSaleChainError(`reschedule chain longer than ${maxRescheduleChainLength} orders`));
    }

    const chainOrderIds = [...visitedOrderIds, orderId];
    return this.#findOwnFiscalSale(partnerId, orderId).pipe(
      switchMap((transaction: FiscalTransactionResponse | null) => {
        if (isOwnSale(transaction)) {
          return of({ orderId, sale: transaction });
        }
        return sourceRescheduleOrderId$.pipe(
          switchMap((sourceOrderId: number | undefined) => {
            if (sourceOrderId == null) {
              return of(transaction == null ? null : { orderId, sale: transaction });
            }
            return this.#findInChain(partnerId, sourceOrderId, this.#loadSourceRescheduleOrderId(partnerId, sourceOrderId), chainOrderIds);
          }),
        );
      }),
    );
  }

  #findOwnFiscalSale(partnerId: number, orderId: number): Observable<FiscalTransactionResponse | null> {
    return this.#fiscalTransactionApiService.getByOrderId(partnerId, orderId).pipe(
      map((transaction: FiscalTransactionResponse) => {
        if (transaction.state === 'PENDING') {
          throw new PendingFiscalSaleError(`order ${orderId} has a fiscal transaction still pending`);
        }
        return isSignedWithFiscalNumber(transaction) ? transaction : null;
      }),
      catchError((error: unknown) => (isNotFound(error) ? of(null) : throwError(() => error))),
    );
  }

  #loadSourceRescheduleOrderId(partnerId: number, orderId: number): Observable<number | undefined> {
    return defer(() => this.#purchaseService.getOrder(partnerId, orderId, { includeReschedules: true })).pipe(
      map((response: BaseResponse<Order | null>) => {
        if (response.data == null) {
          throw new FiscalSaleChainError(
            `order ${orderId} of the reschedule chain could not be loaded: ${response.error?.code ?? 'no data'}`,
          );
        }
        return response.data.sourceRescheduleOrderId;
      }),
    );
  }
}
