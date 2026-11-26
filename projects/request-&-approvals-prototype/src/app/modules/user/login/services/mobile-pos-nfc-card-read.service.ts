import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { SKIP_AUTHENTICATION_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-authentication.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PaymentConfigStorageService } from '../../../box-office/shared/services/payment/payment-config-storage.service';
import { MobilePosNfcCardReadFailure } from '../enums/mobile-pos-nfc-card-read-failure.enum';
import { MobilePosNfcCardReadError } from '../models/mobile-pos-nfc-card-read-error.model';

interface MobilePosNfcCardReadDto {
  nfc_uid: string;
}

@Injectable({
  providedIn: 'root',
})
export class MobilePosNfcCardReadService {
  readonly #adyenTerminalIdPattern = /^[A-Za-z0-9]{2,16}-[0-9]{6,20}$/;
  readonly #datadogLogService = inject(DatadogLogService);
  readonly #failuresByErrorCode: Readonly<Record<string, MobilePosNfcCardReadFailure>> = {
    INVALID_MOBILE_POS_SERIAL: MobilePosNfcCardReadFailure.NotAvailable,
    NFC_CARD_READ_NOT_AVAILABLE: MobilePosNfcCardReadFailure.NotAvailable,
    NFC_CARD_READ_TIMEOUT: MobilePosNfcCardReadFailure.NoCardDetected,
  };
  readonly #http = inject(HttpClient);
  readonly #paymentConfigStorageService = inject(PaymentConfigStorageService);

  getMobilePosSerial(): string | null {
    const mobilePosSerial: string | null = this.#paymentConfigStorageService.getMobilePosSerial();
    return mobilePosSerial !== null && this.#adyenTerminalIdPattern.test(mobilePosSerial) ? mobilePosSerial : null;
  }

  createServiceId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(5)), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  read(mobilePosSerial: string, serviceId: string): Observable<string> {
    return this.#http
      .post<BaseResponse<MobilePosNfcCardReadDto | null> | null>(
        this.#getNfcCardReadsUrl(mobilePosSerial),
        { service_id: serviceId },
        {
          context: new HttpContext().set(SKIP_AUTHENTICATION_INTERCEPTOR, true).set(SKIP_RETRY_INTERCEPTOR, true),
        },
      )
      .pipe(
        map(response => this.#toNfcUid(response?.data ?? null, mobilePosSerial)),
        catchError((error: unknown) => throwError(() => this.#toReadError(error, mobilePosSerial))),
      );
  }

  cancel(mobilePosSerial: string, serviceId: string): Observable<void> {
    return this.#http
      .post<void>(
        `${this.#getNfcCardReadsUrl(mobilePosSerial)}/cancel`,
        { service_id: serviceId },
        {
          context: new HttpContext().set(SKIP_AUTHENTICATION_INTERCEPTOR, true).set(SKIP_RETRY_INTERCEPTOR, true),
        },
      )
      .pipe(
        catchError((error: unknown) => {
          this.#datadogLogService.logWarn('[MobilePosNfcCardRead] The card read cancel request failed', {
            error_code: ErrorResponseUtils.getErrorResponseError(error).code,
            serial: mobilePosSerial,
          });
          return EMPTY;
        }),
      );
  }

  #failureFor(errorResponse: BaseErrorResponse): MobilePosNfcCardReadFailure {
    const code: number | string = errorResponse.code;
    if (typeof code === 'string' && this.#failuresByErrorCode[code] !== undefined) {
      return this.#failuresByErrorCode[code];
    }
    return MobilePosNfcCardReadFailure.ReadFailed;
  }

  #getNfcCardReadsUrl(mobilePosSerial: string): string {
    return `${environment.apiGWBaseUrl}/1.0/mobile-pos/${encodeURIComponent(mobilePosSerial)}/nfc-card-reads`;
  }

  #toNfcUid(dto: MobilePosNfcCardReadDto | null, mobilePosSerial: string): string {
    if (dto === null || !dto.nfc_uid) {
      this.#datadogLogService.logError('[MobilePosNfcCardRead] The card read response carried no nfc uid', {
        serial: mobilePosSerial,
      });
      throw new MobilePosNfcCardReadError(MobilePosNfcCardReadFailure.ReadFailed);
    }
    return dto.nfc_uid;
  }

  #toReadError(error: unknown, mobilePosSerial: string): MobilePosNfcCardReadError {
    if (error instanceof MobilePosNfcCardReadError) {
      return error;
    }
    const errorResponse: BaseErrorResponse = ErrorResponseUtils.getErrorResponseError(error);
    const failure: MobilePosNfcCardReadFailure = this.#failureFor(errorResponse);
    const payload = { error_code: errorResponse.code, failure, serial: mobilePosSerial };
    if (failure === MobilePosNfcCardReadFailure.NoCardDetected) {
      this.#datadogLogService.logInfo('[MobilePosNfcCardRead] No card was tapped within the read window', payload);
    } else {
      this.#datadogLogService.logWarn('[MobilePosNfcCardRead] The card read request failed', payload);
    }
    return new MobilePosNfcCardReadError(failure);
  }
}
