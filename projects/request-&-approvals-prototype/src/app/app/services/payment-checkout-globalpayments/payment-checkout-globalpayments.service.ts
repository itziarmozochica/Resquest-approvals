import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import {
  CheckoutPaymentFinishedTransaction,
  GlobalPaymentsCancelPaymentPayload,
  GlobalPaymentsCheckout,
  GlobalPaymentsCheckoutPaymentPayload,
  GlobalPaymentsCheckoutPaymentResultData,
  GlobalPaymentsCreateCheckoutBody,
  GlobalPaymentsRefundPaymentPayload,
  GlobalPaymentsRefundResultData,
} from '@fz-original/app/app/models/payment-checkout-globalpayments.model';
import {
  CancelPaymentMessage,
  PaymentCheckoutMessage,
  PaymentCheckoutTransaction,
  PaymentCheckoutTransactionData,
  RefundPaymentMessage,
} from '@fz-original/app/app/models/payment.model';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { IBaseResponse } from '@fz-original/app/shared/models/base-response';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '@fz-original/app/shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { WebViewTypeMessage } from '@fz-original/app/shared/services/webview-messenger/models/web-view-type-message.model';
import { MessageType, WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class PaymentCheckoutGlobalPaymentsService {
  static readonly checkoutPaymentTimeout = 135000; // 2 minutes and 15 seconds

  #checkoutLoggerService = inject(CheckoutLoggerService);
  #datadogLogService = inject(DatadogLogService);
  #http = inject(HttpClient);
  #webviewMessengerService = inject(WebviewMessengerService);

  cancel(currency: string, transactionId: string, url: string): Observable<undefined> {
    const message: CancelPaymentMessage<GlobalPaymentsCancelPaymentPayload> = {
      payload: {
        paymentGateway: 'globalpayments',
      },
      type: WebViewTypeMessage.payment_cancel,
    };
    this.#webviewMessengerService.sendWebViewMessage(message);

    return this.#http.post(url, { currency, transaction_id: transactionId }).pipe(
      map((): undefined => undefined),
      catchError((error: unknown) => {
        this.#checkoutLoggerService.error('[GlobalPayments][Cancel] Error calling cancel endpoint', {
          stage: CheckoutStageEnum.CHECKOUT,
          cartId: undefined,
          data: { transactionId, error: JSON.stringify(error) },
        });
        return throwError(() =>
          ErrorResponseUtils.getErrorResponseFromGroup(error, PaymentCheckout[PaymentCheckout.globalpayments] as PaymentCheckoutET),
        );
      }),
    );
  }

  createGlobalPaymentsCheckout(
    url: string,
    cartId: string,
    userId: number,
    partnerId: number,
    request: GlobalPaymentsCreateCheckoutBody,
  ): Observable<string | GlobalPaymentsCheckout> {
    this.#checkoutLoggerService.info('Going to create GlobalPayments Checkout', this.#getCheckoutLoggerContext(cartId));

    return this.#createTransaction(url, cartId, userId, request).pipe(
      switchMap((response: IBaseResponse<PaymentCheckoutTransaction>) => {
        const transactionId: string = response.data!.transactionId;
        this.#checkoutLoggerService.info(
          'GlobalPayments transaction created, sending CheckoutPayment web message',
          this.#getCheckoutLoggerContext(cartId, { transactionId }),
        );

        return new Observable<string | GlobalPaymentsCheckout>(subscriber => {
          subscriber.next(transactionId);

          this.#sendCheckoutMessage(request);

          const innerSubscription = this.#webviewMessengerService
            .observeOnce<GlobalPaymentsCheckoutPaymentResultData>(MessageType.CheckoutPaymentResult)
            .pipe(
              timeout(PaymentCheckoutGlobalPaymentsService.checkoutPaymentTimeout),
              switchMap((responseData: GlobalPaymentsCheckoutPaymentResultData) => {
                this.#checkoutLoggerService.info(
                  'CheckoutPaymentFinished web message received',
                  this.#getCheckoutLoggerContext(cartId, {
                    transactionId,
                    status: responseData.status,
                    hasTransactionData: !!responseData.data?.transaction,
                  }),
                );

                if (responseData.status === 499) {
                  return throwError(() =>
                    ErrorResponseUtils.getErrorResponseFromGroup(
                      new Error(`Payment was cancelled with status: 499`),
                      PaymentCheckout[PaymentCheckout.globalpayments] as PaymentCheckoutET,
                    ),
                  );
                }

                if (responseData.status !== 200) {
                  return throwError(() =>
                    ErrorResponseUtils.getErrorResponseFromGroup(
                      new Error(`Payment failed with status: ${responseData.status}`),
                      PaymentCheckout[PaymentCheckout.globalpayments] as PaymentCheckoutET,
                    ),
                  );
                }

                const transaction: CheckoutPaymentFinishedTransaction | undefined = responseData.data?.transaction;
                if (transaction === undefined) {
                  return throwError(() =>
                    ErrorResponseUtils.getErrorResponseFromGroup(
                      new Error('No transaction data received from payment result'),
                      PaymentCheckout[PaymentCheckout.globalpayments] as PaymentCheckoutET,
                    ),
                  );
                }

                return this.#updateTransaction(partnerId, transactionId, transaction, cartId);
              }),
              catchError((error: unknown) => {
                this.#checkoutLoggerService.error(
                  'Error waiting for CheckoutPaymentResult',
                  this.#getCheckoutLoggerContext(cartId, { transactionId, error: JSON.stringify(error) }),
                );
                return throwError(() =>
                  ErrorResponseUtils.getErrorResponseFromGroup(error, PaymentCheckout[PaymentCheckout.globalpayments] as PaymentCheckoutET),
                );
              }),
            )
            .subscribe({
              next: updateTransactionResponse => {
                subscriber.next(updateTransactionResponse);
              },
              error: error => {
                subscriber.error(error);
              },
              complete: () => {
                subscriber.complete();
              },
            });

          return () => {
            innerSubscription.unsubscribe();
          };
        });
      }),
    );
  }

  refundLocalPayment(
    partnerId: number,
    transactionId: string,
    amount: number,
    currencyCode: string,
    cardNumber4Digits: string,
    transactionNumber: string,
  ): Observable<undefined> {
    this.#datadogLogService.logInfo(`Going to refund GlobalPayments Checkout for transaction ${transactionId}`);
    const message: RefundPaymentMessage<GlobalPaymentsRefundPaymentPayload> = {
      payload: {
        paymentGateway: 'globalpayments',
        data: {
          amount: amount,
          currencyCode: currencyCode,
          cardNumber4Digits: cardNumber4Digits,
          originalTransactionNumber: transactionNumber,
        },
      },
      type: WebViewTypeMessage.payment_refund,
    };

    this.#webviewMessengerService.sendWebViewMessage(message);

    return this.#webviewMessengerService.observeOnce<GlobalPaymentsRefundResultData>(MessageType.RefundPaymentResult).pipe(
      timeout(PaymentCheckoutGlobalPaymentsService.checkoutPaymentTimeout),
      switchMap((responseData: GlobalPaymentsRefundResultData) => {
        if (responseData.status === 200) {
          return this.#http
            .post(this.#buildUpdateTransactionUrl(partnerId), {
              transaction_id: transactionId,
              status: 'REFUNDED',
              transaction_number: transactionNumber,
              card_number_last_four_digits: cardNumber4Digits,
            })
            .pipe(map((): undefined => undefined));
        }
        return of(undefined);
      }),
    );
  }

  #buildUpdateTransactionUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/globalpayments/update-transaction/`;
  }

  #createTransaction(
    url: string,
    cartId: string,
    userId: number,
    request: GlobalPaymentsCreateCheckoutBody,
  ): Observable<IBaseResponse<PaymentCheckoutTransaction>> {
    return this.#http
      .post<PaymentCheckoutTransactionData>(url, {
        user_id: userId,
        channel_id: request.channelId,
        device_id: request.paymentDeviceId,
        payment_method_type: request.paymentMethodType,
      })
      .pipe(
        map((response: PaymentCheckoutTransactionData): IBaseResponse<PaymentCheckoutTransaction> => {
          this.#checkoutLoggerService.info(
            'GlobalPayments transaction created',
            this.#getCheckoutLoggerContext(cartId, {
              transactionId: response.transaction_id,
            }),
            { cartId: cartId },
          );
          return {
            data: {
              transactionId: response.transaction_id,
            },
            error: null,
          };
        }),
        catchError(() => {
          return throwError(() =>
            ErrorResponseUtils.getErrorResponseFromGroup(
              new Error('GlobalPayments checkout failed'),
              PaymentCheckout[PaymentCheckout.globalpayments] as PaymentCheckoutET,
            ),
          );
        }),
      );
  }

  #getCheckoutLoggerContext(cartId: string, data: Record<string, unknown> | null = null): CheckoutLogContext {
    return { stage: CheckoutStageEnum.CHECKOUT, cartId: cartId, data };
  }

  #sendCheckoutMessage(request: GlobalPaymentsCreateCheckoutBody): void {
    const message: PaymentCheckoutMessage<GlobalPaymentsCheckoutPaymentPayload> = {
      payload: {
        data: {
          amount: request.totalAmount,
          currencyCode: request.currencyCode,
        },
        paymentGateway: 'globalpayments',
      },
      type: WebViewTypeMessage.payment_checkout,
    };

    this.#webviewMessengerService.sendWebViewMessage(message);
  }

  #updateTransaction(
    partnerId: number,
    transactionId: string,
    transaction: CheckoutPaymentFinishedTransaction,
    cartId: string,
  ): Observable<GlobalPaymentsCheckout> {
    return this.#http
      .post(this.#buildUpdateTransactionUrl(partnerId), {
        transaction_id: transactionId,
        status: 'CAPTURED',
        transaction_number: transaction.transactionNumber,
        card_number_last_four_digits: transaction.last4cardNumbers,
      })
      .pipe(
        map(() => ({
          amount: transaction.amount,
          currencyCode: transaction.currencyCode,
          last4cardNumbers: transaction.last4cardNumbers,
          transactionId: transactionId,
          transactionNumber: transaction.transactionNumber,
        })),
        catchError((error: unknown) => {
          this.#checkoutLoggerService.error(
            'Error updating transaction status on payment success',
            this.#getCheckoutLoggerContext(cartId, { transactionId, error: JSON.stringify(error) }),
          );
          this.#datadogLogService.logError('[GlobalPayments][Checkout] Error updating transaction status', {
            cartId,
            transactionId,
            partnerId,
            error: JSON.stringify(error),
          });
          return throwError(() =>
            ErrorResponseUtils.getErrorResponseFromGroup(error, PaymentCheckout[PaymentCheckout.globalpayments] as PaymentCheckoutET),
          );
        }),
      );
  }
}
