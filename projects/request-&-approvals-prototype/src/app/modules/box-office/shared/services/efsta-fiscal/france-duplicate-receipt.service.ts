import { HttpClient, HttpErrorResponse, HttpHeaders, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { BaseResponseDTO } from '@fz-original/app/shared/models/base-response';
import { OrderChannelType } from '@fz-original/app/shared/models/order/order-channel-type.model';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import { catchError, map, Observable, of } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import { FiscalTag } from '../../../../kiosk/services/printer/models/printer-instruction.model';
import { describeComplianceLogError } from './compliance-log-error.util';
import { ChainFiscalSale, FiscalSaleChainService } from './fiscal-sale-chain.service';
import { isTillSaleChannel, noFiscalSaleInChainLogCode } from './fiscal-sale-chain.util';
import { buildComplianceLog } from './models/compliance-log.model';

const FISCAL_TRANSACTION_TIMEOUT_MS = 30_000;
const FISCAL_TRANSACTION_TIMEOUT_HEADERS = new HttpHeaders({ timeout: String(FISCAL_TRANSACTION_TIMEOUT_MS) });

const REPRINT_FAILED_KEY = 'boxOffice.order.fiscal.reprintFailed';

const TOAST_DELAY_MS = 5000;

type FranceDuplicateReceiptResultKind = 'success' | 'no-fiscal' | 'rejected' | 'unexpected-error' | 'invalid-input';

export interface FranceDuplicateReceiptInput {
  channelType?: OrderChannelType;
  partnerId: number | undefined;
  orderId: number | undefined;
  reason: string;
}

export interface FranceFiscalSaleLookupInput {
  channelType?: OrderChannelType;
  partnerId: number | undefined;
  orderId: number | undefined;
  sourceRescheduleOrderId?: number;
}

export type FranceFiscalSaleLookupResult =
  | { kind: 'found'; saleOrderId: number }
  | { kind: 'no-fiscal' | 'unexpected-error' | 'invalid-input' };

export interface FranceDuplicateReceiptSuccess {
  kind: 'success';
  fiscalNumber: string;
  fiscalTags: FiscalTag[];
}

export type FranceDuplicateReceiptResult = FranceDuplicateReceiptSuccess | { kind: Exclude<FranceDuplicateReceiptResultKind, 'success'> };

interface FranceDuplicateReceiptResponseData {
  fiscal_number: string;
  fiscal_tags: FiscalTag[];
}

@Injectable({
  providedIn: 'root',
})
export class FranceDuplicateReceiptService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #fiscalSaleChainService = inject(FiscalSaleChainService);
  readonly #http = inject(HttpClient);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);
  readonly #userService = inject(UserService);

  findFiscalSale(input: FranceFiscalSaleLookupInput): Observable<FranceFiscalSaleLookupResult> {
    const { channelType, partnerId, orderId, sourceRescheduleOrderId } = input;

    if (partnerId == null || orderId == null) {
      return of({ kind: 'invalid-input' });
    }

    return this.#fiscalSaleChainService.findFiscalSale(partnerId, orderId, sourceRescheduleOrderId).pipe(
      map((chainFiscalSale: ChainFiscalSale | null): FranceFiscalSaleLookupResult => {
        if (chainFiscalSale == null) {
          this.#logTillOrderWithoutFiscalSale(
            'logInfo',
            'EFSTA France duplicate: box-office order has no fiscal sale to duplicate, printing the non-fiscal receipt',
            `channelType=${channelType}`,
            channelType,
            partnerId,
            orderId,
          );
          return { kind: 'no-fiscal' };
        }
        return { kind: 'found', saleOrderId: chainFiscalSale.orderId };
      }),
      catchError((error: unknown) => {
        this.#datadogLogService.logError(
          'EFSTA France duplicate: fiscal sale lookup failed, duplicate not registered',
          buildComplianceLog(
            'reprint',
            { country: 'FR', partnerId },
            { ...describeComplianceLogError(error), errorCode: 'EFR_REPRINT_FAILED', orderId },
          ),
        );
        this.#showErrorToast(this.#translate.instant(REPRINT_FAILED_KEY));
        return of<FranceFiscalSaleLookupResult>({ kind: 'unexpected-error' });
      }),
    );
  }

  registerDuplicate(input: FranceDuplicateReceiptInput): Observable<FranceDuplicateReceiptResult> {
    const { channelType, partnerId, orderId, reason } = input;
    const trimmedReason = reason.trim();

    if (partnerId == null || orderId == null || !trimmedReason) {
      return of({ kind: 'invalid-input' });
    }

    return this.#postDuplicate(partnerId, orderId, trimmedReason, channelType);
  }

  #postDuplicate(
    partnerId: number,
    orderId: number,
    trimmedReason: string,
    channelType: OrderChannelType | undefined,
  ): Observable<FranceDuplicateReceiptResult> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/fiscal/duplicate-receipt`;
    const user = this.#userService.getUser();
    const body = {
      order_id: orderId,
      reason: trimmedReason,
      operator_id: String(this.#userService.getUserId() ?? ''),
      operator_name: user?.name ?? '',
    };

    return this.#http
      .post<BaseResponseDTO<FranceDuplicateReceiptResponseData>>(url, body, { headers: FISCAL_TRANSACTION_TIMEOUT_HEADERS })
      .pipe(
        map(response => {
          if (response.data?.fiscal_number) {
            return {
              kind: 'success' as const,
              fiscalNumber: response.data.fiscal_number,
              fiscalTags: response.data.fiscal_tags ?? [],
            };
          }

          if (response.error?.message) {
            this.#showErrorToast(response.error.message);
          } else {
            this.#showErrorToast(this.#translate.instant(REPRINT_FAILED_KEY));
          }
          return { kind: 'unexpected-error' as const };
        }),
        catchError((error: HttpErrorResponse) => {
          if (error.status === HttpStatusCode.NotFound) {
            this.#logTillOrderWithoutFiscalSale(
              'logWarn',
              'EFSTA France duplicate: fiscal sale found but the duplicate endpoint returned 404, printing the non-fiscal receipt',
              `channelType=${channelType}; fiscal sale found, duplicate endpoint returned 404`,
              channelType,
              partnerId,
              orderId,
            );
            return of<FranceDuplicateReceiptResult>({ kind: 'no-fiscal' });
          }

          if (error.status === 422) {
            const message = error.error?.error?.message ?? this.#translate.instant(REPRINT_FAILED_KEY);
            this.#showErrorToast(message);
            return of<FranceDuplicateReceiptResult>({ kind: 'rejected' });
          }

          this.#showErrorToast(this.#translate.instant(REPRINT_FAILED_KEY));
          return of<FranceDuplicateReceiptResult>({ kind: 'unexpected-error' });
        }),
      );
  }

  #logTillOrderWithoutFiscalSale(
    level: 'logInfo' | 'logWarn',
    message: string,
    details: string,
    channelType: OrderChannelType | undefined,
    partnerId: number,
    orderId: number,
  ): void {
    if (!isTillSaleChannel(channelType)) {
      return;
    }
    this.#datadogLogService[level](
      message,
      buildComplianceLog('reprint', { country: 'FR', partnerId }, { details, errorCode: noFiscalSaleInChainLogCode, orderId }),
    );
  }

  #showErrorToast(message: string): void {
    this.#toastService.add({
      message,
      sentiment: AlertSentiment.danger,
      autoHide: true,
      delay: TOAST_DELAY_MS,
    });
  }
}
