import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { AdyenCheckout, AdyenCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-adyen.model';
import {
  GlobalPaymentsCheckout,
  GlobalPaymentsCreateCheckoutBody,
} from '@fz-original/app/app/models/payment-checkout-globalpayments.model';
import { PayhereCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-payhere.model';
import { RazorpayCheckout, RazorpayCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-razorpay.model';
import {
  CreateSquarePairingCode,
  PairingStatus,
  SquareCheckout,
  SquareCreateCheckoutBody,
  SquarePairingCode,
} from '@fz-original/app/app/models/payment-checkout-square.model';
import { StripeCreateCheckoutBody } from '@fz-original/app/app/models/payment-checkout-stripe.model';
import { CreateCheckoutParam, CreateDepositCheckoutParam, PaymentCheckoutTransaction } from '@fz-original/app/app/models/payment.model';
import { PaymentCheckoutAdyenService } from '@fz-original/app/app/services/payment-checkout-adyen/payment-checkout-adyen.service';
import { PaymentCheckoutDelegatedService } from '@fz-original/app/app/services/payment-checkout-delegated/payment-checkout-delegated.service';
import { PaymentCheckoutFreeService } from '@fz-original/app/app/services/payment-checkout-free/payment-checkout-free.service';
import { PaymentCheckoutGlobalPaymentsService } from '@fz-original/app/app/services/payment-checkout-globalpayments/payment-checkout-globalpayments.service';
import { PaymentCheckoutPayhereService } from '@fz-original/app/app/services/payment-checkout-payhere/payment-checkout-payhere.service';
import { PaymentCheckoutRazorpayService } from '@fz-original/app/app/services/payment-checkout-razorpay/payment-checkout-razorpay.service';
import { PaymentCheckoutSquareService } from '@fz-original/app/app/services/payment-checkout-square/payment-checkout-square.service';
import { PaymentCheckoutStripeService } from '@fz-original/app/app/services/payment-checkout-stripe/payment-checkout-stripe.service';
import { PaymentMethod } from '@fz-original/app/modules/box-office/checkout/models/payment-method.model';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { DistributorRouteService, scopedOrganizationHeader } from '@fz-original/app/shared/services/distributor/distributor-route.service';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { PaymentCheckoutFeverService } from '../payment-checkout-fever/payment-checkout-fever.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  #http = inject(HttpClient);
  #paymentCheckoutAdyenService = inject(PaymentCheckoutAdyenService);
  #paymentCheckoutDelegatedService = inject(PaymentCheckoutDelegatedService);
  #paymentCheckoutFeverService = inject(PaymentCheckoutFeverService);
  #paymentCheckoutFreeService = inject(PaymentCheckoutFreeService);
  #paymentCheckoutGlobalPaymentsService = inject(PaymentCheckoutGlobalPaymentsService);
  #paymentCheckoutPayhereService = inject(PaymentCheckoutPayhereService);
  #paymentCheckoutRazorpayService = inject(PaymentCheckoutRazorpayService);
  #paymentCheckoutSquareService = inject(PaymentCheckoutSquareService);
  #paymentCheckoutStripeService = inject(PaymentCheckoutStripeService);
  readonly #distributorRoute = inject(DistributorRouteService);

  cancelPayment({
    currency,
    partnerId,
    paymentCheckout,
    placeId,
    planId,
    transactionId,
  }: {
    currency: string;
    partnerId: number;
    paymentCheckout: PaymentCheckoutET;
    placeId: number;
    planId: number;
    transactionId: string;
  }): Observable<undefined> {
    const url: string = this.#getCreateCancelUrl(partnerId, planId, placeId, paymentCheckout);
    switch (paymentCheckout) {
      case PaymentCheckout[PaymentCheckout.adyen]:
        return this.#paymentCheckoutAdyenService.cancel(currency, transactionId, url);
      case PaymentCheckout[PaymentCheckout.payhere]:
        return this.#paymentCheckoutPayhereService.cancel(currency, transactionId, url);
      case PaymentCheckout[PaymentCheckout.razorpay]:
        return this.#paymentCheckoutRazorpayService.cancel(currency, transactionId, url);
      case PaymentCheckout[PaymentCheckout.globalpayments]:
        return this.#paymentCheckoutGlobalPaymentsService.cancel(currency, transactionId, url);
      case PaymentCheckout[PaymentCheckout.square]:
        return this.#paymentCheckoutSquareService.cancel(currency, transactionId, url);
      default:
        throw new Error(`Invalid payment checkout: ${paymentCheckout}`);
    }
  }

  /**
   * @todo replace unknown with the corresponding
   * types for Delegated and Free checkout responses.
   */
  createCheckout(params: {
    adyenCreateCheckoutBody: AdyenCreateCheckoutBody;
    cartId: string;
    partnerId: number;
    paymentCheckout: 'adyen' | 'adyen_local';
    userId: number;
  }): Observable<AdyenCheckout>;
  createCheckout(params: {
    cartId: string;
    partnerId: number;
    paymentCheckout: 'delegated';
    paymentMethod: PaymentMethod;
    userId: number;
    cashReceived?: number;
    cashLegAmount?: number;
    channel?: string;
    deviceId?: string;
    splitLegIndex?: number;
    splitPaymentFlag?: boolean;
  }): Observable<unknown>;
  createCheckout(params: {
    cartId: string;
    partnerId: number;
    paymentCheckout: 'free';
    userId: number;
    channel?: string;
  }): Observable<unknown>;
  createCheckout(params: {
    cartId: string;
    partnerId: number;
    paymentCheckout: 'square';
    squareCreateCheckoutBody: SquareCreateCheckoutBody;
    userId: number;
    channel?: string;
  }): Observable<SquareCheckout>;
  createCheckout(params: {
    cartId: string;
    partnerId: number;
    payhereCreateCheckoutBody: PayhereCreateCheckoutBody;
    paymentCheckout: 'payhere';
    userId: number;
    channel?: string;
  }): Observable<PaymentCheckoutTransaction>;
  createCheckout(params: {
    cartId: string;
    globalPaymentsCreateCheckoutBody: GlobalPaymentsCreateCheckoutBody;
    partnerId: number;
    paymentCheckout: 'globalpayments';
    userId: number;
  }): Observable<GlobalPaymentsCheckout>;
  createCheckout(params: {
    cartId: string;
    partnerId: number;
    paymentCheckout: 'razorpay';
    razorpayCreateCheckoutBody: RazorpayCreateCheckoutBody;
    userId: number;
    channel?: string;
  }): Observable<RazorpayCheckout>;
  createCheckout(params: {
    cartId: string;
    channel: string;
    partnerId: number;
    paymentCheckout: 'fever';
    paymentMethod: Required<PaymentMethod>;
    userId: number;
    b2bUserId?: number;
  }): Observable<BaseResponse<void>>;
  createCheckout(params: {
    cartId: string;
    partnerId: number;
    paymentCheckout: 'stripe';
    paymentMethod: Required<PaymentMethod>;
    stripeCreateCheckoutBody: StripeCreateCheckoutBody;
    userId: number;
    b2bUserId?: number;
    channel?: string;
  }): Observable<object>;
  createCheckout(
    params: CreateCheckoutParam,
  ): Observable<AdyenCheckout | SquareCheckout | PaymentCheckoutTransaction | GlobalPaymentsCheckout | BaseResponse<void> | unknown>;
  createCheckout({
    adyenCreateCheckoutBody,
    b2bUserId,
    cartId,
    cashReceived,
    cashLegAmount,
    channel,
    deviceId,
    globalPaymentsCreateCheckoutBody,
    overrideCapacity,
    partnerId,
    payhereCreateCheckoutBody,
    paymentCheckout,
    paymentMethod,
    razorpayCreateCheckoutBody,
    splitLegIndex,
    splitPaymentFlag,
    squareCreateCheckoutBody,
    stripeCreateCheckoutBody,
    userId,
  }: CreateCheckoutParam):
    | Observable<AdyenCheckout | SquareCheckout | PaymentCheckoutTransaction | GlobalPaymentsCheckout | BaseResponse<void> | unknown>
    | never {
    const url: string = this.#getCreateCheckoutUrl(partnerId, cartId, paymentCheckout);
    switch (paymentCheckout) {
      case PaymentCheckout[PaymentCheckout.adyen]:
      case PaymentCheckout[PaymentCheckout.adyen_local]:
        if (adyenCreateCheckoutBody === undefined) {
          throw new Error('Adyen create checkout body is required for Adyen payment checkout');
        }
        return this.#paymentCheckoutAdyenService.createAdyenCheckout(url, cartId, userId, adyenCreateCheckoutBody);
      case PaymentCheckout[PaymentCheckout.delegated]:
        if (paymentMethod === undefined) {
          throw new Error('Delegated payment method is required for delegated payment checkout');
        }
        if (channel === undefined) {
          throw new Error('Channel is required for delegated payment checkout');
        }
        return this.#paymentCheckoutDelegatedService.createDelegatedCheckout(
          url,
          userId,
          paymentMethod,
          channel,
          overrideCapacity,
          cashReceived,
          cashLegAmount,
          splitLegIndex,
          splitPaymentFlag,
          deviceId,
        );
      case PaymentCheckout[PaymentCheckout.free]:
        return this.#paymentCheckoutFreeService.createFreeCheckout(url, userId, channel, overrideCapacity);
      case PaymentCheckout[PaymentCheckout.square]:
        if (squareCreateCheckoutBody === undefined) {
          throw new Error('Square create checkout body is required for Square payment checkout');
        }
        return this.#paymentCheckoutSquareService.checkoutAsync(url, userId, squareCreateCheckoutBody);
      case PaymentCheckout[PaymentCheckout.payhere]:
        if (payhereCreateCheckoutBody === undefined) {
          throw new Error('Payhere create checkout body is required for Payhere payment checkout');
        }
        return this.#paymentCheckoutPayhereService.createPayhereCheckout(url, cartId, userId, payhereCreateCheckoutBody);
      case PaymentCheckout[PaymentCheckout.globalpayments]:
        if (globalPaymentsCreateCheckoutBody === undefined) {
          throw new Error('GlobalPayments create checkout body is required for GlobalPayments payment checkout');
        }
        return this.#paymentCheckoutGlobalPaymentsService.createGlobalPaymentsCheckout(
          url,
          cartId,
          userId,
          partnerId,
          globalPaymentsCreateCheckoutBody,
        );
      case PaymentCheckout[PaymentCheckout.razorpay]:
        if (razorpayCreateCheckoutBody === undefined) {
          throw new Error('Razorpay create checkout body is required for Razorpay payment checkout');
        }
        return this.#paymentCheckoutRazorpayService.createRazorpayCheckout(url, cartId, userId, razorpayCreateCheckoutBody);
      /**
       * At the moment `paymentMethod.paymentType` can only be
       * PaymentType.BALANCE for 'fever' checkout.
       */
      case PaymentCheckout[PaymentCheckout.fever]: {
        if (channel === undefined) {
          throw new Error('Channel is required for Fever payment checkout');
        }
        if (paymentMethod === undefined) {
          throw new Error('Fever method is required for Fever payment checkout');
        }
        const target = this.#distributorRoute.pairTarget();
        const isBusinessCheckout = b2bUserId !== undefined;
        const feverUrl: string =
          target !== null
            ? this.#getDistributorCheckoutUrl(target.targetOrganizationId, cartId, paymentCheckout)
            : isBusinessCheckout && b2bUserId !== undefined
              ? this.#getCreateBusinessCheckoutUrl(partnerId, b2bUserId, cartId, paymentCheckout)
              : url;
        return this.#paymentCheckoutFeverService.createFeverCheckout(
          feverUrl,
          userId,
          paymentMethod,
          channel,
          target !== null ? scopedOrganizationHeader(target) : {},
        );
      }
      /**
       * At the moment `paymentMethod.paymentType` can only be
       * PaymentType.CARD for 'stripe' checkout.
       */
      case PaymentCheckout[PaymentCheckout.stripe]: {
        if (paymentMethod === undefined) {
          throw new Error('Payment method is required for Stripe payment checkout');
        }
        if (stripeCreateCheckoutBody === undefined) {
          throw new Error('Stripe create checkout body is required for Stripe payment checkout');
        }
        const target = this.#distributorRoute.pairTarget();
        const isBusinessCheckout = b2bUserId !== undefined;
        const stripeUrl: string =
          target !== null
            ? this.#getDistributorCheckoutUrl(target.targetOrganizationId, cartId, paymentCheckout)
            : isBusinessCheckout
              ? this.#getCreateBusinessCheckoutUrl(partnerId, b2bUserId!, cartId, paymentCheckout)
              : url;
        return this.#paymentCheckoutStripeService.createStripeCheckout(
          stripeUrl,
          userId,
          paymentMethod as Required<PaymentMethod>,
          stripeCreateCheckoutBody.paymentIntentId,
          channel,
          target !== null ? scopedOrganizationHeader(target) : {},
        );
      }
      default:
        throw new Error(`Invalid payment checkout: ${paymentCheckout}`);
    }
  }

  createDepositCheckout({
    b2bUserId,
    cartId,
    channel,
    partnerId,
    paymentCheckout,
    paymentMethod,
    stripeCreateCheckoutBody,
    userId,
  }: CreateDepositCheckoutParam): Observable<unknown> {
    const target = this.#distributorRoute.pairTarget();
    const url =
      b2bUserId !== undefined
        ? this.#getCreateBusinessDepositCheckoutUrl(partnerId, b2bUserId, cartId, paymentCheckout)
        : this.#getCreateDepositCheckoutUrl(partnerId, cartId, paymentCheckout);
    switch (paymentCheckout) {
      case PaymentCheckout[PaymentCheckout.fever]: {
        const feverUrl: string =
          target !== null ? this.#getDistributorDepositCheckoutUrl(target.targetOrganizationId, cartId, paymentCheckout) : url;
        return this.#paymentCheckoutFeverService.createFeverCheckout(
          feverUrl,
          userId,
          paymentMethod,
          channel,
          target !== null ? scopedOrganizationHeader(target) : {},
        );
      }
      case PaymentCheckout[PaymentCheckout.stripe]: {
        if (!stripeCreateCheckoutBody) {
          throw new Error('stripeCreateCheckoutBody is required for Stripe deposit checkout');
        }
        const stripeUrl: string =
          target !== null ? this.#getDistributorDepositCheckoutUrl(target.targetOrganizationId, cartId, paymentCheckout) : url;
        return this.#paymentCheckoutStripeService.createStripeCheckout(
          stripeUrl,
          userId,
          paymentMethod as Required<PaymentMethod>,
          stripeCreateCheckoutBody.paymentIntentId,
          channel,
          target !== null ? scopedOrganizationHeader(target) : {},
        );
      }
      case PaymentCheckout[PaymentCheckout.delegated]:
        return this.#paymentCheckoutDelegatedService.createDelegatedCheckout(url, userId, paymentMethod, channel);
      default:
        throw new Error(`Invalid payment checkout: ${paymentCheckout}`);
    }
  }

  isCardPaymentDisallowed(
    planPaymentConfiguration: PaymentConfiguration | null,
    storedPaymentConfiguration: PaymentConfiguration | undefined | null,
    cartAmountIsZero: boolean,
    gatewayProvider: PaymentCheckoutET | 'undefined',
    allowsDelegatedPayment: boolean,
  ): boolean {
    const hasPlanCardConfig: boolean = planPaymentConfiguration !== null && planPaymentConfiguration.hasCardConfig();
    const hasStoredCardConfig: boolean =
      storedPaymentConfiguration !== null && storedPaymentConfiguration !== undefined && storedPaymentConfiguration.hasCardConfig();
    const hasCardConfig: boolean = hasPlanCardConfig || hasStoredCardConfig;
    const hasDeviceConfig: boolean = this.#hasDeviceConfig(storedPaymentConfiguration);
    const isCardPaymentDisallowed: boolean = hasCardConfig && !hasDeviceConfig && !allowsDelegatedPayment;
    const blockedByMissingTerminal: boolean = this.isCardDisabledDueToMissingTerminal(
      storedPaymentConfiguration,
      gatewayProvider,
      allowsDelegatedPayment,
    );
    return cartAmountIsZero || isCardPaymentDisallowed || blockedByMissingTerminal;
  }

  isCardDisabledDueToMissingTerminal(
    storedPaymentConfiguration: PaymentConfiguration | undefined | null,
    gatewayProvider: PaymentCheckoutET | 'undefined',
    allowsDelegatedPayment: boolean,
  ): boolean {
    const hasGatewayConfigured: boolean = gatewayProvider != null && gatewayProvider !== 'undefined';
    const hasDeviceConfig: boolean = this.#hasDeviceConfig(storedPaymentConfiguration);
    return hasGatewayConfigured && !hasDeviceConfig && allowsDelegatedPayment;
  }

  getCardDisabledTooltip(
    storedPaymentConfiguration: PaymentConfiguration | undefined | null,
    gatewayProvider: PaymentCheckoutET | 'undefined',
    allowsDelegatedPayment: boolean,
  ): string | null {
    if (this.isCardDisabledDueToMissingTerminal(storedPaymentConfiguration, gatewayProvider, allowsDelegatedPayment)) {
      return 'boxOffice.cardDisabledNoDevice';
    }
    return null;
  }

  #hasDeviceConfig(storedPaymentConfiguration: PaymentConfiguration | undefined | null): boolean {
    return storedPaymentConfiguration == null
      ? false
      : /**
         * We were formerly erroneously assigning the device id to null
         * in some instances which was causing an issue when the user had
         * kept it like that in local storage.
         *
         * We add this `!= null` in order to avoid runtime errors
         * even thought null is not compliant with our data model
         * for PaymentConfiguration which states that `deviceId` is optional.
         */
        storedPaymentConfiguration.deviceId != null &&
          storedPaymentConfiguration.deviceId.length > 0 &&
          storedPaymentConfiguration.isConfigApplicable();
  }

  pairPayHere(partnerId: number, paymentTerminalId: string, appIdentifier: string, onsiteSetupId: string): Observable<boolean> {
    return this.#paymentCheckoutPayhereService.pair(partnerId, paymentTerminalId, appIdentifier, onsiteSetupId);
  }

  pairSquareCode(partnerId: number, params: CreateSquarePairingCode): Observable<BaseResponse<SquarePairingCode | null>> {
    return this.#paymentCheckoutSquareService.pairingCode(partnerId, params);
  }

  pairSquareStatus(partnerId: number, codeId: string): Observable<BaseResponse<PairingStatus>> {
    return this.#paymentCheckoutSquareService.pairingStatus(partnerId, codeId);
  }

  refundLocalPayment(params: {
    amount: number;
    currencyCode: string;
    last4cardNumbers: string;
    partnerId: number;
    paymentGateway: 'globalpayments';
    transactionId: string;
    transactionNumber: string;
  }): Observable<undefined> {
    return this.#paymentCheckoutGlobalPaymentsService.refundLocalPayment(
      params.partnerId,
      params.transactionId,
      params.amount,
      params.currencyCode,
      params.last4cardNumbers,
      params.transactionNumber,
    );
  }

  /**
   * If we need to create different implementations for
   * different payemnt checkouts, we should move these
   * different functionalities to the corresponding checkout services
   * and leave this one merely as wrapper.
   */
  refundOrder({
    appIdentifier,
    boxOfficeSetupId,
    orderId,
    partnerId,
    paymentCheckout,
    paymentMethod,
    paymentTerminalId,
  }: {
    appIdentifier: string;
    boxOfficeSetupId: string;
    orderId: number;
    partnerId: number;
    paymentCheckout: PaymentCheckoutET;
    paymentMethod: PaymentType;
    paymentTerminalId: string;
  }): Observable<BaseResponse<null, null>> {
    const path = this.#getCreateRefundUrl(partnerId, orderId, paymentCheckout);
    if (paymentCheckout === PaymentCheckout[PaymentCheckout.payhere]) {
      return this.#http
        .post<BaseResponse<null, null>>(path, {
          onsite_setup_id: boxOfficeSetupId,
          payhere_app_identifier: appIdentifier,
          payment_method: paymentMethod,
          payment_terminal_id: paymentTerminalId,
        })
        .pipe(
          catchError((error: BaseResponse<null, null>) => {
            throw error.error;
          }),
        );
    }
    throw new Error('Invalid payment checkout');
  }

  #getCreateBusinessCheckoutUrl(partnerId: number, userId: number, cartId: string, paymentCheckout: PaymentCheckoutET): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/users/${userId}/carts/${cartId}/checkout/${paymentCheckout}`;
  }

  #getCreateBusinessDepositCheckoutUrl(partnerId: number, userId: number, cartId: string, paymentCheckout: PaymentCheckoutET): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/users/${userId}/carts/${cartId}/deposit-checkout/${paymentCheckout}`;
  }

  #getCreateCancelUrl(partnerId: number, planId: number, placeId: number, paymentCheckout: PaymentCheckoutET): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/places/${placeId}/payment/payment-gateways/${paymentCheckout}/cancel/`;
  }

  #getCreateCheckoutUrl(partnerId: number, cartId: string, paymentCheckout: PaymentCheckoutET): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/carts/${cartId}/checkout/${paymentCheckout}`;
  }

  #getCreateDepositCheckoutUrl(partnerId: number, cartId: string, paymentCheckout: PaymentCheckoutET): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/carts/${cartId}/deposit-checkout/${paymentCheckout}`;
  }

  #getCreateRefundUrl(partnerId: number, orderId: number, paymentCheckout: PaymentCheckoutET): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/order/${orderId}/request_onsite_pos_refund/${paymentCheckout}`;
  }

  #getDistributorCheckoutUrl(partnerId: number, cartId: string, paymentCheckout: PaymentCheckoutET): string {
    return `${environment.apiGWBaseUrl}/2.0/partners/${partnerId}/carts/${cartId}/checkout/${paymentCheckout}`;
  }

  #getDistributorDepositCheckoutUrl(partnerId: number, cartId: string, paymentCheckout: PaymentCheckoutET): string {
    return `${environment.apiGWBaseUrl}/2.0/partners/${partnerId}/carts/${cartId}/deposit-checkout/${paymentCheckout}`;
  }
}
