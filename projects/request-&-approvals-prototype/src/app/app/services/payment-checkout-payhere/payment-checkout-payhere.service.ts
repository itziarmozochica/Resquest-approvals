import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentCheckout } from '@fz-original/app/app/enums/payment.enum';
import { PayhereCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-payhere.model';
import { PaymentCheckoutTransaction, PaymentCheckoutTransactionData } from '@fz-original/app/app/models/payment.model';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { BaseResponse, IBaseResponse } from '@fz-original/app/shared/models/base-response';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '@fz-original/app/shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { catchError, map, mergeMap, Observable, of, retry, switchMap, throwError, timer } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutPayhereService {
  #checkoutLoggerService = inject(CheckoutLoggerService);
  #datadogLogService: DatadogLogService = inject(DatadogLogService);
  #http = inject(HttpClient);

  cancel(currency: string, transactionId: string, url: string): Observable<undefined> {
    return this.#http.post(url, { currency, transaction_id: transactionId }).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseFromGroup(error, PaymentCheckout[PaymentCheckout.payhere]))),
    );
  }

  createPayhereCheckout(
    url: string,
    cartId: string,
    userId: number,
    request: PayhereCreateCheckoutBody,
  ): Observable<PaymentCheckoutTransaction> {
    this.#checkoutLoggerService.info('Going to create Payhere Checkout', this.#getCheckoutLoggerContext(cartId));
    return this.#createCheckout(url, cartId, userId, request).pipe(
      map((response: IBaseResponse<PaymentCheckoutTransaction>) => ({
        transactionId: (response.data as PaymentCheckoutTransaction).transactionId,
      })),
    );
  }

  pair(partnerId: number, paymentTerminalId: string, appIdentifier: string, onsiteSetupId: string): Observable<boolean> {
    return this.#pairTerminal(partnerId, paymentTerminalId, appIdentifier, onsiteSetupId).pipe(
      switchMap(() => this.#waitForTerminalConnectedStatus(partnerId, paymentTerminalId, appIdentifier, onsiteSetupId)),
    );
  }

  #createCheckout(
    url: string,
    cartId: string,
    userId: number,
    request: PayhereCreateCheckoutBody,
  ): Observable<IBaseResponse<PaymentCheckoutTransaction>> {
    return this.#http
      .post<PaymentCheckoutTransactionData>(url, {
        user_id: userId,
        channel_id: request.channelId,
        device_id: request.payment_device_id,
        payhere_app_identifier: request.device_identifier,
        onsite_setup_id: request.onsite_setup_id,
        payment_method_type: request.payment_method_type,
      })
      .pipe(
        map((response: PaymentCheckoutTransactionData) => {
          this.#checkoutLoggerService.info(
            'Payhere checkout created',
            this.#getCheckoutLoggerContext(cartId, {
              transactionId: response.transaction_id,
            }),
            { cartId: cartId },
          );
          return {
            data: {
              transactionId: response.transaction_id,
            },
            error: null as unknown,
          };
        }),
        catchError((error: unknown) => {
          this.#checkoutLoggerService.error(
            'Error on create Payhere checkout',
            this.#getCheckoutLoggerContext(cartId, {
              error: JSON.stringify(error),
            }),
            { cartId: cartId, error },
          );
          return throwError(() => ErrorResponseUtils.getErrorResponseFromGroup(error, PaymentCheckout[PaymentCheckout.payhere]));
        }),
      );
  }

  #getCheckoutLoggerContext(cartId: string, data: Record<string, unknown> | null = null): CheckoutLogContext {
    return { stage: CheckoutStageEnum.CHECKOUT, cartId: cartId, data };
  }

  #getPairTerminalUrl(partnerId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/terminal-pairing/payhere`;
  }

  #getTerminalConnectionStatusUrl(partnerId: number, paymentTerminalId: string, appIdentifier: string, onsiteSetupId: string): string {
    const params = new URLSearchParams({
      device_serial_number: paymentTerminalId,
      app_identifier: appIdentifier,
      onsite_setup_id: onsiteSetupId,
    });

    return `${this.#getPairTerminalUrl(partnerId)}?${params.toString()}`;
  }

  #pairTerminal(
    partnerId: number,
    device_serial_number: string,
    app_identifier: string,
    onsiteSetupId?: string,
  ): Observable<BaseResponse<null, null>> {
    const body = {
      device_serial_number,
      app_identifier,
      onsite_setup_id: onsiteSetupId || null,
    };

    return this.#http.post<BaseResponse<null, null>>(this.#getPairTerminalUrl(partnerId), body).pipe(
      catchError((error: BaseResponse<null>) => {
        throw error.error;
      }),
    );
  }

  #waitForTerminalConnectedStatus(
    partnerId: number,
    paymentTerminalId: string,
    appIdentifier: string,
    onsiteSetupId: string,
  ): Observable<boolean> {
    const path: string = this.#getTerminalConnectionStatusUrl(partnerId, paymentTerminalId, appIdentifier, onsiteSetupId);
    const maxRetries = 3;
    const retryDelay = 4000;
    let retryIndex = 0;

    return this.#http.get<BaseResponse<{ is_connected: boolean }>>(path).pipe(
      mergeMap((response: BaseResponse<{ is_connected: boolean }>) => {
        if (response.data !== null && response.data.is_connected) {
          this.#datadogLogService.logInfo(`[${appIdentifier}] Payment terminal ${paymentTerminalId} is connected`);
          return of(true);
        }
        this.#datadogLogService.logWarn(`[${appIdentifier}] Payment terminal ${paymentTerminalId} is not connected`, response);

        if (retryIndex < maxRetries - 1) {
          retryIndex++;
          return throwError(() => new Error('Terminal not connected'));
        }

        return of(true);
      }),
      retry({ delay: () => timer(retryDelay) }),
      catchError(() => of(false)),
    );
  }
}
