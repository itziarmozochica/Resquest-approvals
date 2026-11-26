import { inject, Injectable } from '@angular/core';

import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenCheckout, AdyenCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import {
  GlobalPaymentsCheckout,
  GlobalPaymentsCreateCheckoutBody,
} from '@fz-original/app/app/models/payment-checkout-globalpayments.model';
import { PayhereCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-payhere.model';
import { SquareCheckout, SquareCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-square.model';
import { PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';
import { PaymentCheckoutSquareService } from '@fz-original/app/app/services/payment-checkout-square/payment-checkout-square.service';
import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { DatadogLogLevel } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { KioskOnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/kiosk-onsite-setup';
import { KioskConfiguration } from '@fz-original/app/modules/kiosk/models/kiosk-configuration';
import {
  KioskCreateFreeOrderParams,
  KioskCreateOrderParams,
  KioskTransaction,
} from '@fz-original/app/modules/kiosk/models/kiosk-payment.model';
import { KioskStorageService } from '@fz-original/app/modules/kiosk/services/kiosk-storage.service';
import { KioskService } from '@fz-original/app/modules/kiosk/services/kiosk.service';
import { BehaviorSubject, Observable, of, skip, throwError } from 'rxjs';
import { catchError, map, mergeMap, switchMap, take, tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import { CreateCheckoutEvent } from '../../../../core/tracking/core/events/create-checkout';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { Order } from '../../../../shared/models/order/order.model';
import { BookResultService } from '../../../../shared/services/payment-gateways/book-resut/book-result.service';
import { BookResult } from '../../../../shared/services/payment-gateways/book-resut/models/book-result-status.model';
import { PaymentType } from '../../../box-office/checkout/models/payment-type.enum';
import { checkResponseData } from '../../utils/response';

@Injectable({
  providedIn: 'root',
})
export class KioskPaymentService {
  #bookResultService = inject(BookResultService);
  #currentTransaction$ = new BehaviorSubject<KioskTransaction | null>(null);
  #kioskService = inject(KioskService);
  #kioskStorageService = inject(KioskStorageService);
  #paymentService = inject(PaymentService);
  #trackingService = inject(TrackingService);

  createFreeOrder({
    cart,
    partnerId,
    planId,
    planPlaceId,
  }: KioskCreateFreeOrderParams): Observable<{ transactionId: string; order: Order }> {
    const createCheckout = this.#paymentService.createCheckout({
      cartId: cart.id!,
      channel: this.#kioskStorageService.getChannelId(),
      partnerId: partnerId,
      paymentCheckout: 'free',
      userId: cart.userId!,
    }) as Observable<AdyenCheckout | PaymentCheckoutTransaction | GlobalPaymentsCheckout>;
    const paymentGateway = PaymentCheckout[PaymentCheckout.free] as PaymentCheckoutET;

    return this.#processCheckout(createCheckout, cart, paymentGateway, partnerId, planId, planPlaceId);
  }

  createOrder({
    cart,
    paymentMethodSelected,
    partnerId,
    planId,
    planPlaceId,
  }: KioskCreateOrderParams): Observable<{ transactionId: string; order: Order }> {
    const onsiteSetup = this.#kioskStorageService.getOnsiteSetup();
    if (onsiteSetup === null) {
      throw new Error('Kiosk onsite setup is not configured. Cannot process payment.');
    }
    const paymentGateway: PaymentCheckoutET = onsiteSetup.kiosk_payment_gateway;

    if (paymentGateway === PaymentCheckout[PaymentCheckout.payhere]) {
      return this.#createPayhereOrder({
        cart,
        paymentMethodSelected,
        partnerId,
        planId,
        planPlaceId,
      });
    } else if (paymentGateway === PaymentCheckout[PaymentCheckout.globalpayments]) {
      return this.#createGlobalPaymentsOrder({
        cart,
        paymentMethodSelected,
        partnerId,
        planId,
        planPlaceId,
      });
    } else if (paymentGateway === PaymentCheckout[PaymentCheckout.square]) {
      return this.#createSquareOrder({
        cart,
        paymentMethodSelected,
        partnerId,
        planId,
        planPlaceId,
      });
    } else {
      return this.#createAdyenOrder({
        cart,
        paymentMethodSelected,
        partnerId,
        planId,
        planPlaceId,
      });
    }
  }

  discardCurrentTransaction(byUser: boolean): Observable<[BaseResponse<boolean>, null] | undefined> {
    const onsiteSetup: KioskOnsiteSetup | null = this.#kioskStorageService.getOnsiteSetup();
    const paymentCheckout: PaymentCheckoutET | null = onsiteSetup !== null ? onsiteSetup.kiosk_payment_gateway : null;

    return this.#currentTransaction$.pipe(
      take(2), // Take the latest transaction and the first null value
      switchMap(tx => {
        if (tx === null) return of(undefined); // filter the null

        const { partnerId, planId, planPlaceId, cart, transactionId } = tx;
        if (byUser)
          this.#kioskService.logTrace(`Cart ${cart.id} being discarded by user with transation ${transactionId}`, DatadogLogLevel.Info);

        if (paymentCheckout === null) {
          throw new Error(`Cannot cancel payment for transaction ${transactionId}: payment gateway not available`);
        }

        return this.#paymentService.cancelPayment({
          currency: cart.total!.currency,
          placeId: planPlaceId,
          planId,
          partnerId,
          paymentCheckout,
          transactionId,
        });
      }),
    );
  }

  #createAdyenOrder({
    paymentMethodSelected,
    cart,
    partnerId,
    planId,
    planPlaceId,
  }: KioskCreateOrderParams): Observable<{ transactionId: string; order: Order }> {
    const paymentType =
      paymentMethodSelected.payment_method === PaymentType.CREDIT_CARD || paymentMethodSelected.payment_method === PaymentType.DEBIT_CARD
        ? PaymentType.CARD
        : paymentMethodSelected.payment_method;
    const paymentCardType =
      paymentMethodSelected.payment_method === PaymentType.CREDIT_CARD
        ? 'credit'
        : paymentMethodSelected.payment_method === PaymentType.DEBIT_CARD
          ? 'debit'
          : undefined;
    const request: AdyenCreateCheckoutBody = {
      channelId: this.#kioskStorageService.getChannelId(),
      paymentType: paymentType,
      paymentCardType: paymentCardType,
    };
    const createCheckout: Observable<AdyenCheckout> = this.#paymentService.createCheckout({
      adyenCreateCheckoutBody: request,
      cartId: cart.id!,
      partnerId: partnerId,
      paymentCheckout: 'adyen',
      userId: cart.userId!,
    });

    const paymentGateway = PaymentCheckout[PaymentCheckout.adyen] as PaymentCheckoutET;
    return this.#processCheckout(createCheckout, cart, paymentGateway, partnerId, planId, planPlaceId);
  }

  #createPayhereOrder({
    paymentMethodSelected,
    cart,
    partnerId,
    planId,
    planPlaceId,
  }: KioskCreateOrderParams): Observable<{ transactionId: string; order: Order }> {
    const kioskConfig = this.#kioskStorageService.getConfiguration();
    if (kioskConfig === null) {
      throw new Error('Kiosk configuration is not set. Cannot process Payhere payment.');
    }
    const onsiteSetup = this.#kioskStorageService.getOnsiteSetup();
    if (onsiteSetup === null) {
      throw new Error('Kiosk onsite setup is not configured. Cannot process Payhere payment.');
    }
    const request: PayhereCreateCheckoutBody = {
      channelId: this.#kioskStorageService.getChannelId(),
      device_identifier: kioskConfig.serial,
      payment_device_id: kioskConfig.paymentTerminalId,
      onsite_setup_id: onsiteSetup.id,
      payment_method_type: paymentMethodSelected.payment_method,
    };
    const createCheckout: Observable<PaymentCheckoutTransaction> = this.#paymentService.createCheckout({
      payhereCreateCheckoutBody: request,
      cartId: cart.id!,
      partnerId: partnerId,
      paymentCheckout: 'payhere',
      userId: cart.userId!,
    });

    const paymentGateway = PaymentCheckout[PaymentCheckout.payhere] as PaymentCheckoutET;
    return this.#processCheckout(createCheckout, cart, paymentGateway, partnerId, planId, planPlaceId);
  }

  #createGlobalPaymentsOrder({
    paymentMethodSelected,
    cart,
    partnerId,
    planId,
    planPlaceId,
  }: KioskCreateOrderParams): Observable<{ transactionId: string; order: Order }> {
    const kioskConfig: KioskConfiguration | null = this.#kioskStorageService.getConfiguration();
    if (kioskConfig === null) {
      throw new Error('Kiosk configuration is not set. Cannot process GlobalPayments payment.');
    }

    const request: GlobalPaymentsCreateCheckoutBody = {
      channelId: this.#kioskStorageService.getChannelId(),
      totalAmount: cart.total!.amount,
      currencyCode: cart.total!.currency,
      deviceIdentifier: kioskConfig.serial,
      paymentDeviceId: kioskConfig.paymentTerminalId,
      paymentMethodType: paymentMethodSelected.payment_method,
    };

    const paymentGateway = PaymentCheckout[PaymentCheckout.globalpayments] as PaymentCheckoutET;
    return this.#paymentService
      .createCheckout({
        globalPaymentsCreateCheckoutBody: request,
        cartId: cart.id!,
        partnerId: partnerId,
        paymentCheckout: 'globalpayments',
        userId: cart.userId!,
      })
      .pipe(
        tap(transactionOrCheckoutResult => {
          if (typeof transactionOrCheckoutResult === 'string') {
            this.#currentTransaction$.next({
              transactionId: transactionOrCheckoutResult,
              partnerId: partnerId,
              planId: planId,
              planPlaceId: planPlaceId,
              cart: cart,
            });
          }
        }),
        skip(1), // GlobalPayments observable emits first the transactionId as string and finally the checkout object
        switchMap(transactionOrCheckoutResult => {
          return this.#processCheckout(
            of(transactionOrCheckoutResult as AdyenCheckout | PaymentCheckoutTransaction | GlobalPaymentsCheckout),
            cart,
            paymentGateway,
            partnerId,
            planId,
            planPlaceId,
          );
        }),
        /**
         * Handle GlobalPayments checkout errors explicitly to avoid going through #processCheckout with error observable.
         * We could decouple #processCheckout method into two methods; one for success and one for error handling.
         **/
        catchError(error => {
          return this.#processCheckout(
            throwError(() => error),
            cart,
            paymentGateway,
            partnerId,
            planId,
            planPlaceId,
          );
        }),
      );
  }

  #createSquareOrder({
    paymentMethodSelected,
    cart,
    partnerId,
    planId,
    planPlaceId,
  }: KioskCreateOrderParams): Observable<{ transactionId: string; order: Order }> {
    const kioskConfig: KioskConfiguration | null = this.#kioskStorageService.getConfiguration();
    if (kioskConfig === null) {
      throw new Error('Kiosk configuration is not set. Cannot process Square payment.');
    }
    const onsiteSetup = this.#kioskStorageService.getOnsiteSetup();
    if (onsiteSetup === null) {
      throw new Error('Kiosk onsite setup is not configured. Cannot process Square payment.');
    }
    if (!onsiteSetup.square_location_id || !onsiteSetup.square_application_id) {
      throw new Error('Square configuration is missing. Cannot process Square payment.');
    }
    if (!kioskConfig.paymentTerminalId) {
      throw new Error('Payment terminal ID is not set. Cannot process Square payment.');
    }

    const idempotencyKey = uuidv4().split('-');
    idempotencyKey[0] = PaymentCheckoutSquareService.idempotencyKeyAsyncPrefix;
    const checkout: SquareCreateCheckoutBody = {
      locationId: onsiteSetup.square_location_id,
      applicationId: onsiteSetup.square_application_id,
      deviceId: kioskConfig.paymentTerminalId,
      idempotencyKey: idempotencyKey.join('-'),
      channelId: this.#kioskStorageService.getChannelId(),
      paymentMethodType: paymentMethodSelected.payment_method,
      skipReceiptScreen: true,
    };

    const createCheckout = this.#paymentService.createCheckout({
      cartId: cart.id!,
      partnerId: partnerId,
      paymentCheckout: 'square',
      squareCreateCheckoutBody: checkout,
      userId: cart.userId!,
    });

    const paymentGateway = PaymentCheckout[PaymentCheckout.square] as PaymentCheckoutET;
    return this.#processCheckout(createCheckout, cart, paymentGateway, partnerId, planId, planPlaceId);
  }

  #processCheckout(
    createCheckout: Observable<AdyenCheckout | PaymentCheckoutTransaction | GlobalPaymentsCheckout | SquareCheckout>,
    cart: Cart,
    paymentGateway: PaymentCheckoutET,
    partnerId: number,
    planId: number,
    planPlaceId: number,
  ): Observable<{ transactionId: string; order: Order }> {
    return createCheckout.pipe(
      tap(() => {
        this.#trackingService.track(
          new CreateCheckoutEvent({
            cart_id: cart.id ?? '',
            payment_gateway: paymentGateway,
            payment_method: PaymentType.CARD,
          }),
        );
      }),
      switchMap((response: AdyenCheckout | PaymentCheckoutTransaction | GlobalPaymentsCheckout | SquareCheckout) => {
        const transactionId: string = response.transactionId;
        this.#currentTransaction$.next({ transactionId, partnerId, planId, planPlaceId, cart });
        return this.#bookResultService.getBookResult(paymentGateway, partnerId, planId, planPlaceId, cart, response).pipe(
          catchError(error => {
            if (paymentGateway === PaymentCheckout[PaymentCheckout.globalpayments]) {
              const globalPaymentsCheckout = response as GlobalPaymentsCheckout;
              return this.#paymentService
                .refundLocalPayment({
                  amount: globalPaymentsCheckout.amount,
                  currencyCode: globalPaymentsCheckout.currencyCode,
                  last4cardNumbers: globalPaymentsCheckout.last4cardNumbers,
                  partnerId,
                  paymentGateway: 'globalpayments',
                  transactionId,
                  transactionNumber: globalPaymentsCheckout.transactionNumber,
                })
                .pipe(
                  tap(() => {
                    this.#kioskService.logTrace('GlobalPayments refund processed', DatadogLogLevel.Info, {
                      transactionId,
                    });
                  }),
                  switchMap(() => throwError(() => ({ data: null, error: { code: 1006, message: 'errors.1006' } }))),
                  catchError(refundError => {
                    const isRefundError = refundError?.error?.code === 1006;
                    if (isRefundError) {
                      return throwError(() => refundError);
                    }
                    this.#kioskService.logTrace('GlobalPayments refund failed', DatadogLogLevel.Error, {
                      transactionId,
                      refundError,
                    });
                    return throwError(() => refundError);
                  }),
                );
            }
            return throwError(() => error);
          }),
        );
      }),
      mergeMap((response: BaseResponse<BookResult>) => checkResponseData(response)),
      map((response: BaseResponse<BookResult>) => ({
        transactionId: response.data!.transactionId ?? '',
        order: new Order({ id: response.data!.orderId! }),
      })),
      catchError(error => {
        // Error code 857 = "The transaction was already canceled" (Razorpay)
        // Error message containing "cancelled" or "499" = GlobalPayments cancellation
        const isCancellationError = error?.error?.errorCode === 857 || error?.error?.error?.error?.error?.message.includes('status: 499');
        const isLocalRefund = error?.error?.code === 1006;

        if (isCancellationError || isLocalRefund) {
          this.#currentTransaction$.next(null);
          return throwError(() => error);
        }
        return this.discardCurrentTransaction(false).pipe(switchMap(() => throwError(() => error)));
      }),
    );
  }
}
