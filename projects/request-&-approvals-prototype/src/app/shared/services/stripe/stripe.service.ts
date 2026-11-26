import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { hasTranslationKeyFromService } from '@fz-original/app/shared/utils/translation.utils';
import { StripeKeys } from '@fz-original/environments/environment.model';
import { TranslateService } from '@ngx-translate/core';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';

import { CardElement, confirmCardPayment, createCardElement } from '@feverup/ts-stripe-sdk';

import { environment } from '../../../../environments/environment';
import { FEVER_ERROR_CODE_MAP, FeverPaymentErrorType, FeverPaymentErrorTypeET, STRIPE_ERROR_MAP, StripeError } from './stripe.error';

interface CreatePaymentTokenBody {
  api_version: string;
  payment_method_type: string;
  channel_id?: string;
}

interface StripePaymentTokenErrorBody {
  code?: string;
  error?: { code?: string; message?: string; status_code?: number; user_error?: string };
  message?: string;
  status_code?: number;
  user_error?: string;
}

export const STRIPE_API_VERSION = new InjectionToken<string>('STRIPE_API_VERSION', {
  providedIn: 'root',
  factory: () => '2019-03-14',
});

@Injectable({ providedIn: 'root' })
export class StripeService {
  #http = inject(HttpClient);
  #stripeApiVersion = inject(STRIPE_API_VERSION);
  #translate = inject(TranslateService);

  confirmCardPayment(currency: keyof StripeKeys, clientSecret: string, card: CardElement | null): Observable<string> {
    if (card === null) {
      return throwError(
        () =>
          new BaseResponse(null, {
            code: 'card-required',
            errorCode: FeverPaymentErrorType.GENERIC_ERROR,
            message: 'errors.stripe.card_required',
          }),
      );
    }

    return from(
      confirmCardPayment({
        apiVersion: this.#stripeApiVersion,
        card,
        clientSecret,
        stripeKey: this.getStripeKey(currency),
      }),
    ).pipe(
      map(paymentIntent => paymentIntent.id),
      catchError(error => throwError(() => this.mapStripeError(error))),
    );
  }
  createCardElement(currency: keyof StripeKeys, cssSelector: string): Observable<CardElement | null> {
    let card: CardElement | null = null;
    let destroyed = false;

    return new Observable<CardElement | null>(observer => {
      createCardElement({
        apiVersion: this.#stripeApiVersion,
        cssSelector,
        stripeKey: this.getStripeKey(currency),
        change: ({ complete }) => {
          if (card != null && !destroyed) {
            observer.next(complete ? card : null);
          }
        },
        error: () => {
          if (!destroyed) {
            observer.next(null);
          }
        },
        ready: cardElement => {
          if (!destroyed) {
            card = cardElement;
          } else {
            cardElement.destroy();
          }
        },
      });

      return () => {
        destroyed = true;
        card?.destroy();
        card = null;
      };
    });
  }

  createPaymentToken(
    cartId: string,
    partnerId: number,
    userId: number,
    isManager: boolean,
    channelId: string | null = null,
    actingOrganizationId: number | null = null,
  ): Observable<string> {
    const url =
      actingOrganizationId !== null
        ? `${environment.apiBaseUrl}/3.0/carts/${cartId}/payment-tokens/stripe/`
        : isManager
          ? `${environment.apiBaseUrl}/partners/${partnerId}/carts/${cartId}/payment-tokens/stripe/`
          : `${environment.apiBaseUrl}/partners/${partnerId}/users/${userId}/carts/${cartId}/payment-tokens/stripe/`;

    const body: CreatePaymentTokenBody = {
      api_version: this.#stripeApiVersion,
      payment_method_type: 'card',
      ...(channelId !== null && { channel_id: channelId }),
    };

    return this.#http.post<BaseResponse<{ client_secret: string }>>(url, body, this.#scopeOptions(actingOrganizationId)).pipe(
      map(response => response.data!.client_secret),
      catchError((error: HttpErrorResponse) => {
        const body = error.error as StripePaymentTokenErrorBody | undefined;
        const payload = body?.error ?? body;
        const message = payload?.user_error ?? payload?.message ?? 'Failed to create payment token';
        const code = (payload?.status_code ?? payload?.code)?.toString();
        throw new StripeError(message, code, error.status);
      }),
    );
  }
  createDepositPaymentToken(
    depositId: string,
    partnerId: number,
    userId: number,
    isManager: boolean,
    channelId: string | null = null,
    actingOrganizationId: number | null = null,
  ): Observable<{ client_secret: string; payment_intent_id: string }> {
    const url =
      actingOrganizationId !== null
        ? `${environment.apiBaseUrl}/3.0/deposits/${depositId}/payment-tokens/stripe/`
        : isManager
          ? `${environment.apiBaseUrl}/3.0/partners/${partnerId}/deposits/${depositId}/payment-tokens/stripe/`
          : `${environment.apiBaseUrl}/3.0/partners/${partnerId}/users/${userId}/deposits/${depositId}/payment-tokens/stripe/`;

    const body: CreatePaymentTokenBody = {
      api_version: this.#stripeApiVersion,
      payment_method_type: 'card',
      ...(channelId !== null && { channel_id: channelId }),
    };

    return this.#http
      .post<BaseResponse<{ client_secret: string; payment_intent_id: string }> | null>(url, body, {
        observe: 'response',
        ...this.#scopeOptions(actingOrganizationId),
      })
      .pipe(
        map(response => {
          if (response.status === 204) {
            return { client_secret: '', payment_intent_id: '' };
          }
          const data = response.body?.data;
          const clientSecret = data?.client_secret;
          const paymentIntentId = data?.payment_intent_id;
          if (!clientSecret) {
            throw new StripeError('Failed to create deposit payment token', undefined, response.status);
          }
          return { client_secret: clientSecret, payment_intent_id: paymentIntentId ?? '' };
        }),
        catchError((error: unknown) => {
          if (error instanceof StripeError) {
            throw error;
          }
          const httpError = error as HttpErrorResponse;
          const errBody = httpError.error as StripePaymentTokenErrorBody | undefined;
          const payload = errBody?.error ?? errBody;
          const message = payload?.user_error ?? payload?.message ?? 'Failed to create deposit payment token';
          const code = (payload?.status_code ?? payload?.code)?.toString();
          throw new StripeError(message, code, httpError.status);
        }),
      );
  }

  mapStripeError(error: unknown): BaseResponse<null> {
    const declineCode = (error as { declineCode?: string })?.declineCode ?? '';
    const errorCode = this.#getFeverErrorCode(declineCode);
    const translation = this.#getTranslationKey(errorCode);
    return new BaseResponse(null, {
      code: 'stripe-error',
      errorCode,
      message: translation,
    });
  }

  stripeLegacyOrderCreation(
    partnerId: number,
    cartId: string,
    userId: number,
    reservationId: string | null,
    paymentIntentId: string,
    actingOrganizationId: number | null = null,
  ): Observable<BaseResponse<null, null>> {
    const path = actingOrganizationId !== null ? `${environment.apiBaseUrl}/3.0/orders/` : this.#getSyncOrderCreationUrl(partnerId);
    const requestBody = {
      api_version: this.#stripeApiVersion,
      cart_id: cartId,
      payment_intent_id: paymentIntentId,
      payment_provider: 'stripe',
      reservation_id: reservationId,
      user_id: userId,
    };

    return this.#http.post<BaseResponse<null, null>>(path, requestBody, this.#scopeOptions(actingOrganizationId)).pipe(
      catchError((error: HttpErrorResponse) => {
        const body = error.error as
          | { code?: string | number; error?: { code?: string | number; message?: string }; message?: string }
          | undefined;
        const payload = body?.error ?? body;
        const code = (payload?.code ?? body?.code)?.toString();
        const originalMessage = (payload?.message || body?.message) ?? 'Failed to create legacy order';

        if (code == null || code.length === 0) {
          return throwError(() => new StripeError(originalMessage, code, error.status));
        }

        const translationKey = `errors.${code}`;
        return hasTranslationKeyFromService(this.#translate, translationKey).pipe(
          mergeMap(hasKey =>
            throwError(() => new StripeError(hasKey ? this.#translate.instant(translationKey) : originalMessage, code, error.status)),
          ),
        );
      }),
    );
  }

  #scopeOptions(actingOrganizationId: number | null): { headers?: Record<string, string> } {
    return actingOrganizationId === null ? {} : { headers: { 'X-Scoped-Organization-Id': String(actingOrganizationId) } };
  }

  #getFeverErrorCode(errorCode: string): FeverPaymentErrorTypeET {
    return STRIPE_ERROR_MAP[errorCode] || FeverPaymentErrorType.GENERIC_ERROR;
  }

  #getSyncOrderCreationUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/orders/`;
  }

  #getTranslationKey(feverErrorCode: FeverPaymentErrorTypeET): string {
    return FEVER_ERROR_CODE_MAP[feverErrorCode];
  }

  private getStripeKey(currency: keyof StripeKeys): string {
    let stripeCurrency: keyof StripeKeys = currency;
    const stripeKeys: StripeKeys = environment.stripeKeys;
    if (!(currency in stripeKeys)) {
      stripeCurrency = environment.stripeFallbackCurrency;
    }
    return stripeKeys[stripeCurrency];
  }
}
