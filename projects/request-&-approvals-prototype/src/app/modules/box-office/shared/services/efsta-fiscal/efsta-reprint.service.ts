import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PurchaseService } from '@fz-original/app/shared/services/purchase/purchase.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { describeComplianceLogError } from './compliance-log-error.util';
import { EfrHealthCheckModalService } from './efr-health-check-modal.service';
import { EfstaFiscalService, isEfstaHttpError } from './efsta-fiscal.service';
import { buildProductTypeBySessionTypeId, buildSurchargeTaxRateBySessionTypeId, buildTaxRateBySessionTypeId } from './efsta-fiscal.util';
import { resolveFiscalCountryProfile } from './fiscal-country-profile.util';
import { ChainFiscalSale, FiscalSaleChainError, FiscalSaleChainService } from './fiscal-sale-chain.service';
import { isOrderWithoutTillSale, isTillSaleChannel, noFiscalSaleInChainLogCode } from './fiscal-sale-chain.util';
import { FiscalTerminalPlaceService } from './fiscal-terminal-place.service';
import { FiscalTransactionResponse } from './fiscal-transaction-api.service';
import { buildComplianceLog, ComplianceLogData } from './models/compliance-log.model';
import { EfrHealthErrorCode } from './models/efr-health-check.model';
import { FiscalCountryProfile } from './models/fiscal-country-profile.model';
import { buildFiscalLinesByTicketId } from './pack-fiscal-lines.util';
import { buildPlSurchargeTaxRateBySessionTypeId, buildPlTaxRateBySessionTypeId } from './pl-tax-group-by-rate.util';

export type EfstaReprintResultKind = 'success' | 'no-fiscal' | 'efsta-error' | 'unexpected-error' | 'invalid-input';

export interface EfstaReprintResult {
  kind: EfstaReprintResultKind;
}

export interface EfstaReprintInput {
  order: Order;
  partnerId: number | undefined;
  countryCode?: string;
  onsiteSetupId?: string | number;
}

const NO_FISCAL_TRANSACTION_KEY = 'boxOffice.order.fiscal.noFiscalTransaction';
const REPRINT_FAILED_KEY = 'boxOffice.order.fiscal.reprintFailed';
const TOAST_DELAY_MS = 5000;

const REPRINT_EXCLUDED_HEALTH_ERRORS: readonly EfrHealthErrorCode[] = [
  EfrHealthErrorCode.Z_REQUIRED,
  EfrHealthErrorCode.FISCAL_DAY_NOT_OPEN,
];

@Injectable({
  providedIn: 'root',
})
export class EfstaReprintService {
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #efrHealthCheckModalService = inject(EfrHealthCheckModalService);
  readonly #efstaFiscalService = inject(EfstaFiscalService);
  readonly #fiscalSaleChainService = inject(FiscalSaleChainService);
  readonly #fiscalTerminalPlaceService = inject(FiscalTerminalPlaceService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #purchaseService = inject(PurchaseService);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);

  reprintReceipt(input: EfstaReprintInput): Observable<EfstaReprintResult> {
    const { order, partnerId, countryCode, onsiteSetupId } = input;

    if (!order.id || !order.cart || partnerId == null || order.placeId == null) {
      return of({ kind: 'invalid-input' });
    }

    if (isOrderWithoutTillSale(order)) {
      return of({ kind: 'no-fiscal' });
    }

    const logData: Partial<ComplianceLogData> = {
      country: countryCode,
      partnerId,
      onsiteSetupId: onsiteSetupId != null ? String(onsiteSetupId) : undefined,
    };
    const fiscalCountryProfile = resolveFiscalCountryProfile(this.#optimizelyService, countryCode);
    const placeId = order.placeId;

    return this.#fiscalSaleChainService.findFiscalSale(partnerId, order.id, order.sourceRescheduleOrderId).pipe(
      switchMap((chainFiscalSale: ChainFiscalSale | null) => {
        if (chainFiscalSale == null) {
          this.#logTillOrderWithoutFiscalSale(order, logData);
          return of<EfstaReprintResult>({ kind: 'no-fiscal' });
        }
        const { orderId: saleOrderId, sale: fiscalTx } = chainFiscalSale;
        const requiresCreatedAt = fiscalCountryProfile?.taxGroupResolution !== 'poland-tax-group';
        const fiscalNumber = fiscalTx.fiscal_number;
        if (fiscalTx.operation_type !== 'SALE' || !fiscalNumber || (requiresCreatedAt && !fiscalTx.created_at)) {
          this.#showErrorToast(this.#translate.instant(NO_FISCAL_TRANSACTION_KEY));
          return of<EfstaReprintResult>({ kind: 'unexpected-error' });
        }

        return this.#efrHealthCheckModalService.guardPurchase(countryCode, undefined, REPRINT_EXCLUDED_HEALTH_ERRORS).pipe(
          switchMap(canProceed => {
            if (!canProceed) {
              return of<EfstaReprintResult>({ kind: 'efsta-error' });
            }
            return this.#loadSaleOrder(partnerId, order, saleOrderId).pipe(
              switchMap((saleOrder: Order) =>
                this.#registerReprint(saleOrder, saleOrderId, placeId, fiscalTx, fiscalNumber, logData, fiscalCountryProfile),
              ),
            );
          }),
        );
      }),
      catchError((error: unknown) => {
        this.#datadogLogService.logError(
          'EFSTA reprint: fiscal reprint failed',
          buildComplianceLog('reprint', logData, {
            ...describeComplianceLogError(error),
            errorCode: 'EFR_REPRINT_FAILED',
            orderId: order.id,
          }),
        );
        this.#showErrorToast(this.#translate.instant(REPRINT_FAILED_KEY));
        return of<EfstaReprintResult>({ kind: 'unexpected-error' });
      }),
    );
  }

  #loadSaleOrder(partnerId: number, order: Order, saleOrderId: number): Observable<Order> {
    if (saleOrderId === order.id) {
      return of(order);
    }
    return this.#purchaseService
      .searchOrders({ includeOrderItems: true, includePerItemTax: true, includeReschedules: true, orderId: saleOrderId, partnerId })
      .pipe(
        map((response: BaseResponse<Order[] | null>) => {
          const saleOrder = response.data?.find((candidate: Order) => candidate.id === saleOrderId);
          if (saleOrder?.cart == null) {
            throw new FiscalSaleChainError(`order ${saleOrderId} holding the fiscal sale could not be loaded`);
          }
          return saleOrder;
        }),
      );
  }

  #logTillOrderWithoutFiscalSale(order: Order, logData: Partial<ComplianceLogData>): void {
    if (!isTillSaleChannel(order.channelType)) {
      return;
    }
    this.#datadogLogService.logWarn(
      'EFSTA reprint: box-office order has no fiscal sale in its reschedule chain, printing the non-fiscal receipt',
      buildComplianceLog('reprint', logData, {
        details: `channelType=${order.channelType}`,
        errorCode: noFiscalSaleInChainLogCode,
        orderId: order.id,
      }),
    );
  }

  #registerReprint(
    saleOrder: Order,
    saleOrderId: number,
    placeId: number,
    fiscalTx: FiscalTransactionResponse,
    fiscalNumber: string,
    logData: Partial<ComplianceLogData>,
    fiscalCountryProfile: FiscalCountryProfile | undefined,
  ): Observable<EfstaReprintResult> {
    const isPolishTaxGroupResolution = fiscalCountryProfile?.taxGroupResolution === 'poland-tax-group';
    return this.#efstaFiscalService
      .registerReprint(
        saleOrderId,
        saleOrder.cart!, // #loadSaleOrder only hands over an order with a cart, and reprintReceipt checked the active one
        saleOrder.taxes ?? [],
        { fiscalNumber, originalDate: fiscalTx.created_at ?? '' },
        logData,
        this.#fiscalTerminalPlaceService.resolveFiscalTerminalPlaceId(fiscalCountryProfile, placeId)!, // the place id given is defined, so the resolver returns a place
        isPolishTaxGroupResolution ? buildPlTaxRateBySessionTypeId(saleOrder) : buildTaxRateBySessionTypeId(saleOrder),
        buildProductTypeBySessionTypeId(saleOrder),
        isPolishTaxGroupResolution ? buildPlSurchargeTaxRateBySessionTypeId(saleOrder) : buildSurchargeTaxRateBySessionTypeId(saleOrder),
        fiscalCountryProfile,
        fiscalTx,
        buildFiscalLinesByTicketId(saleOrder),
      )
      .pipe(
        map((result): EfstaReprintResult => {
          if (result == null) {
            return { kind: 'unexpected-error' };
          }
          if (isEfstaHttpError(result)) {
            this.#showErrorToast(this.#translate.instant(REPRINT_FAILED_KEY));
            return { kind: 'efsta-error' };
          }
          return { kind: 'success' };
        }),
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
