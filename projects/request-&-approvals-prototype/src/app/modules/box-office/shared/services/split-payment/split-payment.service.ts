import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { SKIP_FORBIDDEN_TOAST } from '@fz-original/app/shared/interceptors/skip-forbidden-toast.token';
import { SKIP_RETRY_INTERCEPTOR } from '@fz-original/app/shared/interceptors/skip-retry.token';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { OnsiteSetup } from '../../models/onsite-setup';
import { OnsiteSetupsStorageService } from '../onsite-setups/onsite-setups-storage.service';
import { PaymentConfigStorageService } from '../payment/payment-config-storage.service';
import { CartPaymentsStatusResponse, SplitPaymentTriggerResponse } from './models/split-payment-response.model';

const ADYEN_CALL_TIMEOUT_MS = 120_000;
// A retry runs the whole EFSTA registration behind partners' per-cart lock, so it is slower than a
// plain call.
const FISCAL_SIGNING_RETRY_TIMEOUT_MS = 120_000;
const MULTI_METHOD_COMPLIANCE_COUNTRIES = new Set<string>(['AT', 'HU', 'DE', 'FR']);

@Injectable({
  providedIn: 'root',
})
export class SplitPaymentService {
  readonly #http = inject(HttpClient);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #paymentConfigStorageService = inject(PaymentConfigStorageService);

  addSplitPaymentIfConfigured(paymentMethods: PaymentType[]): PaymentType[] {
    return this.#addSplitIf(paymentMethods, this.isSplitPaymentConfigured());
  }

  addSplitPaymentIfNeeded(paymentMethods: PaymentType[]): PaymentType[] {
    return this.#addSplitIf(paymentMethods, this.shouldAllowSplitPayments());
  }

  /**
   * @deprecated Use {@link PaymentsService.cancelPayment} instead. The new dedicated
   * payments client wraps this endpoint with an options object and typed responses; this
   * positional-argument method is kept only for the legacy split flow.
   */
  cancelChildSplit(partnerId: number, cartId: string, childTransactionId: string): Observable<{ success: boolean; error?: string }> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/payments/${childTransactionId}/cancel`;
    return this.#http.post<{ success: boolean; error?: string }>(url, {}).pipe(timeout(ADYEN_CALL_TIMEOUT_MS));
  }

  cancelFiscalSigning(partnerId: number, cartId: string, sessionId: string): Observable<void> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/payments/${sessionId}/fiscal-signing/cancel`;
    return this.#http.post<void>(url, {}, { context: this.#fiscalSigningContext() }).pipe(timeout(FISCAL_SIGNING_RETRY_TIMEOUT_MS));
  }

  /**
   * @deprecated Use {@link PaymentsService.getPaymentsStatus} instead. The new dedicated
   * payments client wraps this endpoint with an options object and an exact-match status
   * union; this positional-argument method is kept only for the legacy split flow.
   */
  getCartPaymentsStatus(partnerId: number, cartId: string, parentTransactionId: string): Observable<CartPaymentsStatusResponse> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/payments/${parentTransactionId}`;
    return this.#http.get<CartPaymentsStatusResponse>(url);
  }

  isMultiMethodComplianceEnabled(): boolean {
    const onsiteSetup = this.#onsiteSetupsStorageService.getConfiguration();
    const countryCode = onsiteSetup?.place?.country_iso_code_2;
    return (
      this.#resolveAllowSplitPayments(onsiteSetup) &&
      countryCode != null &&
      MULTI_METHOD_COMPLIANCE_COUNTRIES.has(countryCode) &&
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.MULTI_METHOD_PAYMENT_COMPLIANCE) === true
    );
  }

  isSplitPaymentConfigured(): boolean {
    return this.#resolveAllowSplitPayments(this.#onsiteSetupsStorageService.getConfiguration());
  }

  retryFiscalSigning(partnerId: number, cartId: string, sessionId: string): Observable<void> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/payments/${sessionId}/fiscal-signing/retry`;
    return this.#http.post<void>(url, {}, { context: this.#fiscalSigningContext() }).pipe(timeout(FISCAL_SIGNING_RETRY_TIMEOUT_MS));
  }

  retryRefundReceiptPrint(
    partnerId: number,
    cartId: string,
    parentTransactionId: string,
  ): Observable<{ success: boolean; error?: string }> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/payments/${parentTransactionId}/retry-refund-receipt-print`;
    return this.#http.post<{ success: boolean; error?: string }>(url, {}).pipe(timeout(ADYEN_CALL_TIMEOUT_MS));
  }

  shouldAllowSplitPayments(): boolean {
    if (!this.isSplitPaymentConfigured()) {
      return false;
    }
    const paymentConfiguration = this.#paymentConfigStorageService.getConfiguration();
    const hasAdyenDeviceConfigured = !!(paymentConfiguration?.deviceId && paymentConfiguration?.adyenConfiguration);
    return hasAdyenDeviceConfigured;
  }

  /**
   * @deprecated Use {@link PaymentsService.createCartPayment} with a `sessionId` instead. The new
   * dedicated payments client triggers a session leg with an options object and typed responses; this
   * positional-argument method is kept only for the legacy split flow.
   */
  triggerNextPayment(partnerId: number, cartId: string, amount?: number): Observable<SplitPaymentTriggerResponse> {
    const url = `${this.#buildBaseUrl(partnerId, cartId)}/split-payment/trigger`;
    const body = amount != null ? { amount } : {};
    return this.#http.post<SplitPaymentTriggerResponse>(url, body).pipe(timeout(ADYEN_CALL_TIMEOUT_MS));
  }

  #addSplitIf(paymentMethods: PaymentType[], allowed: boolean): PaymentType[] {
    const hasAnyCardMethod =
      paymentMethods.includes(PaymentType.CARD) ||
      paymentMethods.includes(PaymentType.CREDIT_CARD) ||
      paymentMethods.includes(PaymentType.DEBIT_CARD);
    if (!allowed || !hasAnyCardMethod) {
      return paymentMethods;
    }
    if (paymentMethods.includes(PaymentType.CARD_SPLIT)) {
      return paymentMethods;
    }
    return [...paymentMethods, PaymentType.CARD_SPLIT];
  }

  #buildBaseUrl(partnerId: number, cartId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/carts/${cartId}`;
  }

  /**
   * A fiscal signing retry or cancel registers with EFSTA, so a generic retry could sign or cancel
   * twice; and the flow tells the cashier about a 403 itself, so the global toast would double it.
   */
  #fiscalSigningContext(): HttpContext {
    return new HttpContext().set(SKIP_RETRY_INTERCEPTOR, true).set(SKIP_FORBIDDEN_TOAST, true);
  }

  #resolveAllowSplitPayments(setup: OnsiteSetup | null | undefined): boolean {
    return setup?.payment_configuration?.allow_split_payments === true;
  }
}
