import { inject, Injectable } from '@angular/core';

import { datadogRum } from '@datadog/browser-rum-slim';
import { defer, MonoTypeOperatorFunction } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { PaymentCheckout } from '../../../app/enums/payment.enum';
import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';

const CART_PREPARE_START_TIME_KEY = 'cart_prepare_start_time';
const CART_ID_KEY = 'cart_prepare_cart_id';

export type SaleCheckoutStep = 'book' | 'checkoutData' | 'confirm' | 'prepare' | 'terminal' | 'trigger';

export type SaleIntegrationMode = 'cloud' | 'local';

type SaleStep = SaleCheckoutStep | 'close' | 'screen' | 'selection';

interface SaleOrder {
  orderId: number | undefined;
  paymentProvider: string | undefined;
  paymentType: string;
}

interface SaleTiming {
  attemptCount: number;
  cartId: string | null;
  integrationMode: SaleIntegrationMode | null;
  legCount: number;
  openCheckouts: number;
  operatorMs: number;
  operatorStartedAt: number | null;
  orderId: number | null;
  paymentProvider: string | null;
  paymentType: string | null;
  singlePrepareCall: boolean | null;
  startedAt: number;
  step: SaleStep;
  stepMs: Readonly<Record<SaleStep, number>>;
  stepStartedAt: number;
  triggerCount: number;
}

const SALE_CHECKOUT_STEPS: ReadonlySet<SaleStep> = new Set<SaleStep>(['book', 'checkoutData', 'confirm', 'prepare', 'terminal', 'trigger']);

const NO_STEP_MS: Readonly<Record<SaleStep, number>> = {
  book: 0,
  checkoutData: 0,
  close: 0,
  confirm: 0,
  prepare: 0,
  screen: 0,
  selection: 0,
  terminal: 0,
  trigger: 0,
};

function toIntegrationMode(gateway: string | undefined): SaleIntegrationMode | null {
  if (gateway === PaymentCheckout[PaymentCheckout.adyen_local]) {
    return 'local';
  }
  if (gateway === PaymentCheckout[PaymentCheckout.adyen]) {
    return 'cloud';
  }
  return null;
}

@Injectable({
  providedIn: 'root',
})
export class CartTimingService {
  #datadogLogService = inject(DatadogLogService);
  #sale: SaleTiming | null = null;

  startPrepareCartTiming(cartId: string): void {
    if (!environment.datadog.rum.enabled) {
      return;
    }

    const startTime = Date.now();
    sessionStorage.setItem(CART_PREPARE_START_TIME_KEY, String(startTime));
    sessionStorage.setItem(CART_ID_KEY, cartId);
  }

  recordOrderConfirmationTiming(orderId: number, cartId: string): void {
    if (!environment.datadog.rum.enabled) {
      return;
    }

    const startTimeStr = sessionStorage.getItem(CART_PREPARE_START_TIME_KEY);
    const storedCartId = sessionStorage.getItem(CART_ID_KEY);

    if (startTimeStr === null) {
      this.#datadogLogService.logWarn('[CartTiming] No start time found for cart timing measurement', {
        orderId,
        cartId,
      });
      return;
    }

    if (storedCartId !== cartId) {
      this.#datadogLogService.logWarn('[CartTiming] Cart ID mismatch, skipping timing measurement', {
        orderId,
        cartId,
        storedCartId,
      });
      this.#clearTimingData();
      return;
    }

    const startTime = Number(startTimeStr);
    if (isNaN(startTime)) {
      this.#datadogLogService.logWarn('[CartTiming] Invalid start time stored', {
        orderId,
        cartId,
        startTimeStr,
      });
      this.#clearTimingData();
      return;
    }

    const durationMs = Date.now() - startTime;
    datadogRum.addTiming('cart_to_order_confirmation', durationMs);

    this.#datadogLogService.logInfo('[CartTiming] Recorded cart to order confirmation timing', {
      orderId,
      cartId,
      durationMs,
    });

    this.#clearTimingData();
  }

  startSale(cartId: string): void {
    const sale = this.#sale;
    if (sale !== null && this.#isInCheckout(sale)) {
      this.#sale = { ...sale, cartId };
      return;
    }
    this.#sale = this.#newSale(cartId, 'selection');
  }

  startSaleCheckout(cartId: string | null): void {
    const sale = this.#sale;
    if (sale !== null && this.#isInCheckout(sale)) {
      this.#sale = { ...sale, openCheckouts: sale.openCheckouts + 1 };
      return;
    }
    if (sale !== null && sale.step === 'selection' && sale.cartId !== null && sale.cartId === cartId) {
      this.#sale = { ...this.#moveTo(sale, 'checkoutData', performance.now()), attemptCount: sale.attemptCount + 1, openCheckouts: 1 };
      return;
    }
    this.#sale = { ...this.#newSale(cartId, 'checkoutData'), attemptCount: 1, openCheckouts: 1 };
  }

  endSaleCheckoutAttempt(): void {
    const sale = this.#sale;
    if (sale === null || !this.#isInCheckout(sale)) {
      return;
    }
    if (sale.openCheckouts > 1) {
      this.#sale = { ...sale, openCheckouts: sale.openCheckouts - 1 };
      return;
    }
    const now = performance.now();
    this.#sale = this.#moveTo(this.#withOperatorStopped(sale, now), 'selection', now);
  }

  markSaleStep(step: SaleCheckoutStep): void {
    const sale = this.#sale;
    if (sale === null || !this.#isInCheckout(sale)) {
      return;
    }
    this.#sale = {
      ...this.#moveTo(sale, step, performance.now()),
      triggerCount: step === 'trigger' ? sale.triggerCount + 1 : sale.triggerCount,
    };
  }

  recordSalePrepareCall(isSinglePrepareCall: boolean): void {
    const sale = this.#sale;
    if (sale === null || !this.#isInCheckout(sale)) {
      return;
    }
    this.#sale = { ...sale, singlePrepareCall: isSinglePrepareCall };
  }

  recordSaleLegSettled(gateway: string | undefined): void {
    const sale = this.#sale;
    if (sale === null || !this.#isInCheckout(sale)) {
      return;
    }
    this.#sale = {
      ...this.#moveTo(sale, 'book', performance.now()),
      integrationMode: toIntegrationMode(gateway) ?? sale.integrationMode,
      legCount: sale.legCount + 1,
    };
  }

  recordSaleOrder({ orderId, paymentProvider, paymentType }: SaleOrder): void {
    const sale = this.#sale;
    if (sale === null || !this.#isInCheckout(sale)) {
      return;
    }
    const now = performance.now();
    this.#sale = {
      ...this.#moveTo(this.#withOperatorStopped(sale, now), 'close', now),
      integrationMode: sale.integrationMode ?? toIntegrationMode(paymentProvider),
      orderId: orderId ?? null,
      paymentProvider: paymentProvider ?? null,
      paymentType,
    };
  }

  markSaleCheckoutClosed(): void {
    const sale = this.#sale;
    if (sale?.step !== 'close') {
      return;
    }
    this.#sale = this.#moveTo(sale, 'screen', performance.now());
  }

  setOperatorActive(isActive: boolean): void {
    const sale = this.#sale;
    if (sale === null || sale.step === 'selection') {
      return;
    }
    const now = performance.now();
    if (!isActive) {
      this.#sale = this.#withOperatorStopped(sale, now);
      return;
    }
    if (sale.operatorStartedAt !== null) {
      return;
    }
    const operatorSale = this.#isInCheckout(sale) ? this.#moveTo(sale, 'checkoutData', now) : sale;
    this.#sale = { ...operatorSale, operatorStartedAt: now };
  }

  trackOperatorTime<T>(): MonoTypeOperatorFunction<T> {
    return source =>
      defer(() => {
        const sale = this.#sale;
        if (sale !== null && this.#isInCheckout(sale) && sale.step !== 'checkoutData') {
          return source;
        }
        let isOperatorActive = true;
        const stopOperator = (): void => {
          if (isOperatorActive) {
            isOperatorActive = false;
            this.setOperatorActive(false);
          }
        };
        this.setOperatorActive(true);
        return source.pipe(tap(stopOperator), finalize(stopOperator));
      });
  }

  getSaleIntegrationMode(): SaleIntegrationMode | null {
    return this.#sale?.integrationMode ?? null;
  }

  recordSaleScreenShown(cartId: string | undefined): void {
    const sale = this.#sale;
    this.#sale = null;
    if (sale === null || sale.step !== 'screen' || sale.cartId !== cartId || !environment.datadog.rum.enabled) {
      return;
    }

    const now = performance.now();
    const { operatorMs, stepMs } = this.#moveTo(this.#withOperatorStopped(sale, now), 'screen', now);
    const durationMs = Math.round(now - sale.startedAt);
    const totalOperatorMs = Math.round(stepMs.selection + operatorMs);
    const terminalMs = Math.round(stepMs.terminal);
    datadogRum.addTiming('cart_to_order_confirmation', durationMs);

    this.#datadogLogService.logInfo('[CartTiming] Recorded cart to order confirmation timing', {
      attemptCount: sale.attemptCount,
      bookMs: Math.round(stepMs.book),
      cartId,
      checkoutDataMs: Math.round(stepMs.checkoutData),
      closeMs: Math.round(stepMs.close),
      confirmMs: Math.round(stepMs.confirm),
      durationMs,
      integrationMode: sale.integrationMode,
      legCount: sale.legCount,
      operatorMs: totalOperatorMs,
      orderId: sale.orderId,
      paymentProvider: sale.paymentProvider,
      paymentType: sale.paymentType,
      prepareMs: Math.round(stepMs.prepare),
      screenMs: Math.round(stepMs.screen),
      selectionMs: Math.round(stepMs.selection),
      singlePrepareCall: sale.singlePrepareCall,
      systemMs: durationMs - totalOperatorMs - terminalMs,
      terminalMs,
      triggerCount: sale.triggerCount,
      triggerMs: Math.round(stepMs.trigger),
    });
  }

  #clearTimingData(): void {
    sessionStorage.removeItem(CART_PREPARE_START_TIME_KEY);
    sessionStorage.removeItem(CART_ID_KEY);
  }

  #isInCheckout(sale: SaleTiming): boolean {
    return SALE_CHECKOUT_STEPS.has(sale.step);
  }

  #moveTo(sale: SaleTiming, step: SaleStep, now: number): SaleTiming {
    return {
      ...sale,
      step,
      stepMs: { ...sale.stepMs, [sale.step]: sale.stepMs[sale.step] + now - sale.stepStartedAt },
      stepStartedAt: now,
    };
  }

  #newSale(cartId: string | null, step: SaleStep): SaleTiming {
    const now = performance.now();
    return {
      attemptCount: 0,
      cartId,
      integrationMode: null,
      legCount: 0,
      openCheckouts: 0,
      operatorMs: 0,
      operatorStartedAt: null,
      orderId: null,
      paymentProvider: null,
      paymentType: null,
      singlePrepareCall: null,
      startedAt: now,
      step,
      stepMs: NO_STEP_MS,
      stepStartedAt: now,
      triggerCount: 0,
    };
  }

  #withOperatorStopped(sale: SaleTiming, now: number): SaleTiming {
    if (sale.operatorStartedAt === null) {
      return sale;
    }
    return { ...sale, operatorMs: sale.operatorMs + now - sale.operatorStartedAt, operatorStartedAt: null };
  }
}
