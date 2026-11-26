import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { OrderTaxes } from '@fz-original/app/shared/models/order/order-taxes.model';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { catchError, map, Observable, of, throwError, timeout, TimeoutError } from 'rxjs';

import { environment } from '../../../../../../environments/environment';
import { HuFiscalRefundData, HuRefundType } from '../../components/hu-fiscal-refund-popup/hu-fiscal-refund.model';
import { FiscalLinesByTicketId } from './efsta-esr-mapper-common.util';
import {
  buildPlEsrRequest,
  buildPlRefundEsrRequest,
  buildPlReprintEsrRequest,
  PlEsrMapError,
  PlPaymentTender,
  toPlDescription,
} from './efsta-esr-mapper-pl.util';
import { buildEsrRequest, buildRefundEsrRequest, buildReprintEsrRequest, hasVoucher, ReprintFiscalData } from './efsta-esr-mapper.util';
import { EfstaFiscalGroupService } from './efsta-fiscal-group.service';
import { FiscalTransactionResponse } from './fiscal-transaction-api.service';
import { buildComplianceLog, ComplianceLogData } from './models/compliance-log.model';
import { EsrRegisterResponse } from './models/efsta-esr-response.model';
import { EsrRequest } from './models/efsta-esr.model';
import { FiscalCountryProfile } from './models/fiscal-country-profile.model';
import { buildPlSurchargeTaxGroupBySessionTypeId, buildPlTaxGroupBySessionTypeId } from './pl-tax-group-by-rate.util';

const EFR_TIMEOUT_MS = 30_000;
const DUPLICATE_ERROR_CODE = '#DUPLICATE';
const SUCCESS_RESULT_CODE = 'OK';

export interface EfstaRegistrationHttpError {
  readonly kind: 'http-error';
  readonly status: number;
  readonly body: unknown;
  readonly errorCode: string;
  readonly message: string;
}

export type EfstaRegistrationResult = EsrRegisterResponse | EfstaRegistrationHttpError | null;

export function isEfstaHttpError(result: EfstaRegistrationResult): result is EfstaRegistrationHttpError {
  return result != null && typeof result === 'object' && 'kind' in result && result.kind === 'http-error';
}

interface PolishRegistrationInput {
  fiscalCountryProfile: FiscalCountryProfile;
  fiscalLinesByTicketId?: FiscalLinesByTicketId;
  orderDate?: string;
  paidDepositAmount?: Money | null;
  paymentTenders?: readonly PlPaymentTender[];
  surchargeTaxRateBySessionTypeId?: Map<number, number>;
  taxRateBySessionTypeId?: Map<number, number>;
}

@Injectable({
  providedIn: 'root',
})
export class EfstaFiscalService {
  readonly #http = inject(HttpClient);
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #userService = inject(UserService);
  readonly #efstaFiscalGroupService = inject(EfstaFiscalGroupService);

  registerFiscalReceipt(
    orderId: number,
    cart: Cart,
    taxes: OrderTaxes[],
    isReprint: boolean,
    logData: Partial<ComplianceLogData>,
    placeId: number,
    orderCreatedAt: string | undefined,
    taxRateBySessionTypeId: Map<number, number> | undefined,
    productTypeBySessionTypeId: Map<number, string> | undefined,
    surchargeTaxRateBySessionTypeId: Map<number, number> | undefined,
    fiscalCountryProfile: FiscalCountryProfile,
    paymentTenders?: readonly PlPaymentTender[],
    paidDepositAmount?: Money | null,
    fiscalLinesByTicketId?: FiscalLinesByTicketId,
  ): Observable<EfstaRegistrationResult> {
    if (fiscalCountryProfile.mapper === 'poland') {
      const plEsrRequest = this.#buildPolishRegistrationRequest(orderId, cart, placeId, {
        fiscalCountryProfile,
        fiscalLinesByTicketId,
        orderDate: orderCreatedAt,
        paidDepositAmount,
        paymentTenders,
        surchargeTaxRateBySessionTypeId,
        taxRateBySessionTypeId,
      });

      return this.#sendToEfr(orderId, plEsrRequest, 'registration', logData, true);
    }

    if (hasVoucher(cart)) {
      this.#datadogLogService.logInfo(
        'EFSTA fiscal receipt includes voucher - HU restriction applies',
        buildComplianceLog('registration', logData, {
          orderId,
          details: `coupon=${cart.appliedCoupon?.code ?? 'unknown'} discount=${cart.appliedCoupon?.discount?.amount ?? 'N/A'}`,
        }),
      );
    }

    const esrRequest = buildEsrRequest(orderId, cart, taxes, {
      fiscalLinesByTicketId,
      taxRateBySessionTypeId,
      productTypeBySessionTypeId,
      surchargeTaxRateBySessionTypeId,
      placeId: placeId != null ? String(placeId) : undefined,
      orderDate: orderCreatedAt,
      paidDepositAmount,
      resolveFiscalGroup: this.#efstaFiscalGroupService.createResolver(fiscalCountryProfile, 'registration', orderId),
    });

    return this.#sendToEfr(orderId, esrRequest, 'registration', logData, false);
  }

  registerReprint(
    orderId: number,
    cart: Cart,
    taxes: OrderTaxes[],
    reprintData: ReprintFiscalData,
    logData: Partial<ComplianceLogData>,
    placeId: number,
    taxRateBySessionTypeId?: Map<number, number>,
    productTypeBySessionTypeId?: Map<number, string>,
    surchargeTaxRateBySessionTypeId?: Map<number, number>,
    fiscalCountryProfile?: FiscalCountryProfile,
    originalTransaction?: FiscalTransactionResponse | null,
    fiscalLinesByTicketId?: FiscalLinesByTicketId,
  ): Observable<EfstaRegistrationResult> {
    if (fiscalCountryProfile?.mapper === 'poland') {
      const plLogData: Partial<ComplianceLogData> = { ...logData, originalFiscalNumber: reprintData.fiscalNumber };

      let plEsrRequest: EsrRequest;
      try {
        if (originalTransaction == null) {
          throw new Error('Cannot build Polish reprint ESR request: missing original fiscal transaction');
        }
        plEsrRequest = this.#withPlOperatorName(
          buildPlReprintEsrRequest(originalTransaction, {
            coupon: cart.appliedCoupon,
            currency: cart.total?.currency,
            placeId: placeId != null ? String(placeId) : undefined,
          }),
        );
      } catch (error: unknown) {
        this.#datadogLogService.logError(
          'EFSTA fiscal receipt reprint skipped - duplicate could not be mapped',
          buildComplianceLog('reprint', plLogData, {
            errorCode: error instanceof PlEsrMapError ? error.code : 'EFR_MAPPING_FAILED',
            orderId,
            details: error instanceof Error ? error.message : String(error),
          }),
        );
        return throwError(() => error);
      }

      return this.#sendToEfr(orderId, plEsrRequest, 'reprint', plLogData, true);
    }

    const esrRequest = buildReprintEsrRequest(orderId, cart, taxes, reprintData, {
      fiscalLinesByTicketId,
      taxRateBySessionTypeId,
      productTypeBySessionTypeId,
      surchargeTaxRateBySessionTypeId,
      placeId: placeId != null ? String(placeId) : undefined,
      resolveFiscalGroup: this.#efstaFiscalGroupService.createResolver(fiscalCountryProfile, 'reprint', orderId),
    });

    return this.#sendToEfr(orderId, esrRequest, 'reprint', logData, true);
  }

  #buildPolishRegistrationRequest(orderId: number, cart: Cart, placeId: number, input: PolishRegistrationInput): EsrRequest {
    const esrRequest = buildPlEsrRequest(orderId, cart, {
      fiscalLinesByTicketId: input.fiscalLinesByTicketId,
      orderDate: input.orderDate,
      paidDepositAmount: input.paidDepositAmount,
      paymentTenders: input.paymentTenders,
      placeId: placeId != null ? String(placeId) : undefined,
      resolveFiscalGroup: this.#efstaFiscalGroupService.createResolver(input.fiscalCountryProfile, 'registration', orderId),
      surchargeTaxGroupBySessionTypeId: buildPlSurchargeTaxGroupBySessionTypeId(input.surchargeTaxRateBySessionTypeId),
      taxGroupBySessionTypeId: buildPlTaxGroupBySessionTypeId(input.taxRateBySessionTypeId),
    });

    return this.#withPlOperatorName(esrRequest);
  }

  #withPlOperatorName(esrRequest: EsrRequest): EsrRequest {
    const operatorName = toPlDescription(this.#userService.getUser()?.name ?? '');
    if (operatorName.length === 0) {
      return esrRequest;
    }

    return { Tra: { ESR: { ...esrRequest.Tra.ESR, OprN: operatorName } } };
  }

  #sendToEfr(
    orderId: number,
    esrRequest: ReturnType<typeof buildEsrRequest>,
    subprocess: 'registration' | 'reprint',
    logData: Partial<ComplianceLogData>,
    rejectsNonOkResultCode: boolean,
  ): Observable<EfstaRegistrationResult> {
    const startTime = performance.now();
    const url = `${environment.efstaEfrBaseUrl}/register`;

    return this.#http.post<EsrRegisterResponse>(url, JSON.stringify(esrRequest), { headers: { 'Content-Type': 'text/plain' } }).pipe(
      timeout(EFR_TIMEOUT_MS),
      map((response: EsrRegisterResponse): EfstaRegistrationResult => {
        const durationMs = Math.round(performance.now() - startTime);

        const nonOkResultCodeError = rejectsNonOkResultCode ? toNonOkResultCodeError(response, subprocess === 'registration') : null;
        if (nonOkResultCodeError != null) {
          this.#datadogLogService.logError(
            subprocess === 'reprint' ? 'EFSTA fiscal receipt reprint failed' : 'EFSTA fiscal receipt registration failed',
            buildComplianceLog(subprocess, logData, {
              orderId,
              durationMs,
              details: nonOkResultCodeError.message,
              errorCode: nonOkResultCodeError.errorCode,
            }),
          );
          return nonOkResultCodeError;
        }

        if (subprocess === 'registration') {
          const isDuplicate = response.TraC?.Result?.ErrorCode === DUPLICATE_ERROR_CODE;
          if (isDuplicate) {
            this.#datadogLogService.logInfo(
              'EFSTA fiscal receipt already registered',
              buildComplianceLog('registration', logData, { orderId, durationMs, errorCode: '#DUPLICATE' }),
            );
            return response;
          }
        }

        this.#datadogLogService.logInfo(
          subprocess === 'reprint'
            ? 'EFSTA fiscal receipt reprint registered successfully'
            : 'EFSTA fiscal receipt registered successfully',
          buildComplianceLog(subprocess, logData, {
            orderId,
            durationMs,
            efrResponseCode: response.TraC?.Result?.RC,
            fiscalNumber: response.TraC?.ESR?.FN?.toString(),
          }),
        );
        return response;
      }),
      catchError((error: unknown) => {
        const durationMs = Math.round(performance.now() - startTime);

        this.#datadogLogService.logError(
          subprocess === 'reprint' ? 'EFSTA fiscal receipt reprint failed' : 'EFSTA fiscal receipt registration failed',
          buildComplianceLog(subprocess, logData, {
            orderId,
            durationMs,
            ...this.#extractEfrErrorFields(error),
          }),
        );

        if (error instanceof HttpErrorResponse && error.status > 0) {
          const result = error.error?.TraC?.Result;
          const efrErrorCode = result?.ErrorCode;
          return of<EfstaRegistrationHttpError>({
            kind: 'http-error',
            status: error.status,
            body: error.error,
            errorCode: efrErrorCode ? `EFR_${efrErrorCode}` : `EFR_HTTP_${error.status}`,
            message: extractEfrErrorMessage(error),
          });
        }

        return of(null);
      }),
    );
  }

  #extractEfrErrorFields(error: unknown): { errorCode: string; details: string } {
    const httpStatus = (error as { status?: number })?.status;
    const errorMessage = (error as { message?: string })?.message ?? String(error);
    const isTimeout = error instanceof TimeoutError;
    return {
      errorCode: isTimeout ? 'EFSTA_TIMEOUT' : httpStatus ? `EFR_HTTP_${httpStatus}` : 'EFR_UNKNOWN',
      details: errorMessage,
    };
  }

  registerFiscalRefund(
    orderId: number,
    refundType: HuRefundType,
    fiscalData: HuFiscalRefundData | null,
    originalTransaction: FiscalTransactionResponse,
    logData: Partial<ComplianceLogData>,
    placeId?: number,
    currency?: string,
    refundedQuantityByLineIndex?: ReadonlyMap<number, number>,
    fiscalCountryProfile?: FiscalCountryProfile,
    coupon?: Coupon | null,
    plErrorCorrectionReason?: string | null,
  ): Observable<EfstaRegistrationResult> {
    const isPolishMapper = fiscalCountryProfile?.mapper === 'poland';
    let esrRequest: EsrRequest;
    if (isPolishMapper) {
      try {
        esrRequest = this.#withPlOperatorName(
          buildPlRefundEsrRequest(originalTransaction, {
            coupon,
            currency,
            errorCorrectionReason: plErrorCorrectionReason,
            placeId: placeId != null ? String(placeId) : undefined,
            refundedQuantityByLineIndex,
          }),
        );
      } catch (error: unknown) {
        return throwError(() => error);
      }
    } else if (fiscalData == null) {
      return throwError(() => new Error('Cannot build refund ESR request: missing Hungarian refund data'));
    } else {
      esrRequest = buildRefundEsrRequest(refundType, fiscalData, originalTransaction, {
        coupon,
        placeId: placeId != null ? String(placeId) : undefined,
        currency,
        refundedQuantityByLineIndex,
      });
    }

    return this.#postFiscalRefundEsr(orderId, esrRequest, logData, isPolishMapper);
  }

  #postFiscalRefundEsr(
    orderId: number,
    esrRequest: EsrRequest,
    logData: Partial<ComplianceLogData>,
    rejectsNonOkResultCode: boolean,
  ): Observable<EfstaRegistrationResult> {
    const startTime = performance.now();
    const url = `${environment.efstaEfrBaseUrl}/register`;

    return this.#http.post<EsrRegisterResponse>(url, JSON.stringify(esrRequest), { headers: { 'Content-Type': 'text/plain' } }).pipe(
      timeout(EFR_TIMEOUT_MS),
      map((response: EsrRegisterResponse): EfstaRegistrationResult => {
        const durationMs = Math.round(performance.now() - startTime);
        const isDuplicate = response.TraC?.Result?.ErrorCode === DUPLICATE_ERROR_CODE;

        const nonOkResultCodeError = rejectsNonOkResultCode ? toNonOkResultCodeError(response, true) : null;
        if (nonOkResultCodeError != null) {
          this.#datadogLogService.logError(
            'EFSTA fiscal refund registration failed',
            buildComplianceLog('refund', logData, {
              orderId,
              durationMs,
              details: nonOkResultCodeError.message,
              errorCode: nonOkResultCodeError.errorCode,
            }),
          );
          return nonOkResultCodeError;
        }

        if (isDuplicate) {
          this.#datadogLogService.logInfo(
            'EFSTA fiscal refund duplicate - already registered',
            buildComplianceLog('refund', logData, { orderId, durationMs }),
          );
          return response;
        }

        this.#datadogLogService.logInfo(
          'EFSTA fiscal refund registered successfully',
          buildComplianceLog('refund', logData, {
            orderId,
            durationMs,
            efrResponseCode: response.TraC?.Result?.RC,
            fiscalNumber: response.TraC?.ESR?.FN?.toString(),
          }),
        );
        return response;
      }),
      catchError((error: unknown) => {
        const durationMs = Math.round(performance.now() - startTime);

        this.#datadogLogService.logError(
          'EFSTA fiscal refund registration failed',
          buildComplianceLog('refund', logData, {
            orderId,
            durationMs,
            ...this.#extractEfrErrorFields(error),
          }),
        );

        if (error instanceof HttpErrorResponse && error.status > 0) {
          const result = error.error?.TraC?.Result;
          const efrErrorCode = result?.ErrorCode;
          return of<EfstaRegistrationHttpError>({
            kind: 'http-error',
            status: error.status,
            body: error.error,
            errorCode: efrErrorCode ? `EFR_${efrErrorCode}` : `EFR_HTTP_${error.status}`,
            message: extractEfrErrorMessage(error),
          });
        }

        return of(null);
      }),
    );
  }
}

function toNonOkResultCodeError(response: EsrRegisterResponse, exemptsDuplicate: boolean): EfstaRegistrationHttpError | null {
  const result = response.TraC?.Result;
  const resultCode = result?.RC;
  if (exemptsDuplicate && resultCode == null && result?.ErrorCode === DUPLICATE_ERROR_CODE) {
    return null;
  }
  if (resultCode === SUCCESS_RESULT_CODE) {
    return null;
  }
  const efrErrorCode = result?.ErrorCode;
  return {
    kind: 'http-error',
    status: 200,
    body: response,
    errorCode: efrErrorCode ? `EFR_${efrErrorCode}` : resultCode == null ? 'EFR_MISSING_RESULT_CODE' : `EFR_RC_${resultCode}`,
    message: efrErrorCode
      ? `${efrErrorCode} | RC=${resultCode}`
      : resultCode == null
        ? 'Missing TraC.Result.RC in EFR response'
        : `RC=${resultCode}`,
  };
}

function extractEfrErrorMessage(error: HttpErrorResponse): string {
  const body = error.error;
  if (typeof body === 'string') {
    return body;
  }
  const result = body?.TraC?.Result;
  if (result != null) {
    const parts: string[] = [];
    if (result.ErrorCode) {
      parts.push(result.ErrorCode);
    }
    if (result.RC && result.RC !== 'OK') {
      parts.push(`RC=${result.RC}`);
    }
    if (Array.isArray(result.Warning) && result.Warning.length > 0) {
      parts.push(result.Warning.join('; '));
    }
    if (parts.length > 0) {
      return parts.join(' | ');
    }
  }
  return error.message;
}
