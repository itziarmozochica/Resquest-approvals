import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { CartTimingService } from '@fz-original/app/shared/services/cart-timing/cart-timing.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IGNT_DIALOG_REF, type IgntDialogRef } from '@ignite/common';
import { take } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

import type { CheckoutFlowType, CheckoutStepId } from '../../models/checkout.model';
import { posCheckoutModalAmountEntered } from '../events/pos-checkout-modal-amount-entered.event';
import { posCheckoutModalBack } from '../events/pos-checkout-modal-back.event';
import { posCheckoutModalCalculatorClosed } from '../events/pos-checkout-modal-calculator-closed.event';
import { posCheckoutModalCalculatorOpened } from '../events/pos-checkout-modal-calculator-opened.event';
import { posCheckoutModalClosed } from '../events/pos-checkout-modal-closed.event';
import { posCheckoutModalFlowChanged } from '../events/pos-checkout-modal-flow-changed.event';
import { posCheckoutModalFlowSelected } from '../events/pos-checkout-modal-flow-selected.event';
import { posCheckoutModalHistoryViewed } from '../events/pos-checkout-modal-history-viewed.event';
import { posCheckoutModalItemsSelected } from '../events/pos-checkout-modal-items-selected.event';
import { posCheckoutModalLegCancelled } from '../events/pos-checkout-modal-leg-cancelled.event';
import { posCheckoutModalMethodSelected } from '../events/pos-checkout-modal-method-selected.event';
import { posCheckoutModalOpened } from '../events/pos-checkout-modal-opened.event';
import { posCheckoutModalPayRemainingToggled } from '../events/pos-checkout-modal-pay-remaining-toggled.event';
import { posCheckoutModalPaymentFailed } from '../events/pos-checkout-modal-payment-failed.event';
import { posCheckoutModalPaymentMethodChangedAfterFail } from '../events/pos-checkout-modal-payment-method-changed-after-fail.event';
import { posCheckoutModalPaymentRetried } from '../events/pos-checkout-modal-payment-retried.event';
import { posCheckoutModalPaymentStarted } from '../events/pos-checkout-modal-payment-started.event';
import { posCheckoutModalPaymentSucceeded } from '../events/pos-checkout-modal-payment-succeeded.event';
import { posCheckoutModalSessionCancelFailed } from '../events/pos-checkout-modal-session-cancel-failed.event';
import { posCheckoutModalSessionCancelRetried } from '../events/pos-checkout-modal-session-cancel-retried.event';
import { posCheckoutModalSessionCancelStarted } from '../events/pos-checkout-modal-session-cancel-started.event';
import { posCheckoutModalSessionCancelSucceeded } from '../events/pos-checkout-modal-session-cancel-succeeded.event';
import { posCheckoutModalSessionSnapshot } from '../events/pos-checkout-modal-session-snapshot.event';
import { posCheckoutModalSplitConfigured } from '../events/pos-checkout-modal-split-configured.event';
import { posCheckoutModalStepTransitioned } from '../events/pos-checkout-modal-step-transitioned.event';
import { posCheckoutModalTerminalSelected } from '../events/pos-checkout-modal-terminal-selected.event';
import {
  buildCheckoutModalPath,
  resolveCheckoutModalCloseOutcome,
  type CheckoutModalCloseOutcome,
  type CheckoutModalTrackingSnapshot,
} from '../utils/checkout-modal-tracking-snapshot.util';

const OPERATOR_STEP_IDS: ReadonlySet<CheckoutStepId> = new Set<CheckoutStepId>([
  'amountEntry',
  'calculator',
  'cashCapture',
  'flowSelection',
  'itemSelection',
  'methodSelection',
  'splitConfig',
]);

@Injectable()
export class CheckoutModalTrackingService {
  readonly #cartTimingService = inject(CartTimingService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject<IgntDialogRef<MultiStepModalResult> | null>(IGNT_DIALOG_REF, { optional: true });
  readonly #fzTracking = inject(FzTrackingService);

  #checkoutSessionId = uuidv4();
  #openedAtMs = Date.now();
  #sequence = 0;
  #sessionStarted = false;
  #sessionClosed = false;
  #sessionCancelSucceeded = false;
  #paymentLinkSent = false;
  #cancelRetryCount = 0;
  #pathSteps: CheckoutStepId[] = [];
  #intents: string[] = [];
  #methodSequence: string[] = [];
  #lastStepId: CheckoutStepId | null = null;
  #lastSnapshot: CheckoutModalTrackingSnapshot | null = null;

  constructor() {
    this.#dialogRef?.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(result => {
      this.trackClosed(result?.completed === true);
    });
  }

  get checkoutSessionId(): string {
    return this.#checkoutSessionId;
  }

  trackOpened(snapshot: CheckoutModalTrackingSnapshot): void {
    if (this.#sessionStarted) {
      return;
    }
    this.#sessionStarted = true;
    this.#openedAtMs = Date.now();
    this.#checkoutSessionId = uuidv4();
    this.#sequence = 0;
    this.#pathSteps = [];
    this.#intents = [];
    this.#methodSequence = [];
    this.#sessionCancelSucceeded = false;
    this.#paymentLinkSent = false;
    this.#cancelRetryCount = 0;
    this.#lastSnapshot = snapshot;

    this.#fzTracking.track(
      posCheckoutModalOpened({
        availableMethods: snapshot.availableMethods,
        cartTotal: snapshot.cartTotal,
        checkoutSessionId: this.#checkoutSessionId,
        currency: snapshot.currency,
        itemCount: snapshot.itemCount,
      }),
    );
  }

  trackClosed(completed: boolean): void {
    if (this.#sessionClosed || !this.#sessionStarted) {
      return;
    }
    this.#sessionClosed = true;

    const snapshot = this.#lastSnapshot;
    const outcome = resolveCheckoutModalCloseOutcome({
      completed,
      lastStepId: this.#lastStepId,
      paymentLinkSent: this.#paymentLinkSent,
      sessionCancelSucceeded: this.#sessionCancelSucceeded,
    });
    const durationMs = Date.now() - this.#openedAtMs;
    const history = snapshot?.history ?? [];
    const lastStepId = this.#lastStepId;

    this.#fzTracking.track(
      posCheckoutModalClosed({
        checkoutSessionId: this.#checkoutSessionId,
        durationMs,
        flowType: snapshot?.flowType ?? null,
        hadRecordedPayments: snapshot?.hadRecordedPayments ?? false,
        history,
        lastStepId,
        legsCompleted: snapshot?.legsCompleted ?? 0,
        outcome,
        paidAmount: snapshot?.paidAmount ?? 0,
        remainingAmount: snapshot?.remainingAmount ?? 0,
        stepCount: this.#pathSteps.length,
      }),
    );

    this.trackSessionSnapshot(outcome, durationMs, snapshot?.flowType ?? null, snapshot?.legsCompleted ?? 0);
    this.trackStepTransitioned({
      intent: null,
      navigationKind: 'close',
      fromStepId: lastStepId,
      toStepId: null,
      snapshot: snapshot ?? this.#emptySnapshot(),
    });
  }

  trackSessionSnapshot(
    outcome: CheckoutModalCloseOutcome,
    durationMs: number,
    flowType: CheckoutFlowType | null,
    legsCompleted: number,
  ): void {
    this.#fzTracking.track(
      posCheckoutModalSessionSnapshot({
        checkoutSessionId: this.#checkoutSessionId,
        durationMs,
        flowType,
        intents: [...this.#intents],
        legsCompleted,
        methodSequence: [...this.#methodSequence],
        outcome,
        path: buildCheckoutModalPath(this.#pathSteps),
      }),
    );
  }

  trackStepTransitioned(params: {
    intent: string | null;
    navigationKind: 'enter' | 'transition' | 'back' | 'close';
    fromStepId: CheckoutStepId | null;
    toStepId: CheckoutStepId | null;
    snapshot: CheckoutModalTrackingSnapshot;
  }): void {
    const { intent, navigationKind, fromStepId, toStepId, snapshot } = params;
    this.#lastSnapshot = snapshot;
    this.#lastStepId = toStepId ?? fromStepId;
    if (toStepId !== null && (this.#pathSteps.length === 0 || this.#pathSteps[this.#pathSteps.length - 1] !== toStepId)) {
      this.#pathSteps = [...this.#pathSteps, toStepId];
    }
    if (intent !== null) {
      this.#intents = [...this.#intents, intent];
    }
    this.#cartTimingService.setOperatorActive(toStepId !== null && OPERATOR_STEP_IDS.has(toStepId));

    this.#fzTracking.track(
      posCheckoutModalStepTransitioned({
        cancelFailureReason: snapshot.cancelFailureReason,
        checkoutSessionId: this.#checkoutSessionId,
        currentSplitIndex: snapshot.currentSplitIndex,
        elapsedMs: Date.now() - this.#openedAtMs,
        flowType: snapshot.flowType,
        fromStepId,
        hadRecordedPayments: snapshot.hadRecordedPayments,
        history: snapshot.history,
        historyDepth: snapshot.history.length,
        intent,
        legAmount: snapshot.legAmount,
        navigationKind,
        paidAmount: snapshot.paidAmount,
        paymentFailureReason: snapshot.paymentFailureReason,
        paymentStarted: snapshot.paymentStarted,
        payRemaining: snapshot.payRemaining,
        remainingAmount: snapshot.remainingAmount,
        resendRequested: snapshot.resendRequested,
        selectedItemCount: snapshot.selectedItemCount,
        selectedMethod: snapshot.selectedMethod,
        sequence: this.#sequence++,
        splitCount: snapshot.splitCount,
        toStepId,
        transactionsCount: snapshot.transactionsCount,
      }),
    );
  }

  trackFlowSelected(flowType: CheckoutFlowType, fromFlowType: CheckoutFlowType | null): void {
    this.#fzTracking.track(
      posCheckoutModalFlowSelected({
        checkoutSessionId: this.#checkoutSessionId,
        flowType,
        fromFlowType,
      }),
    );
  }

  trackSplitConfigured(splitCount: number, cartTotal: number): void {
    this.#fzTracking.track(
      posCheckoutModalSplitConfigured({
        cartTotal,
        checkoutSessionId: this.#checkoutSessionId,
        splitCount,
      }),
    );
  }

  trackItemsSelected(selectedItemCount: number, selectedAmount: number, payRemaining: boolean): void {
    this.#fzTracking.track(
      posCheckoutModalItemsSelected({
        checkoutSessionId: this.#checkoutSessionId,
        payRemaining,
        selectedAmount,
        selectedItemCount,
      }),
    );
  }

  trackAmountEntered(amount: number, payRemaining: boolean, remainingAmount: number): void {
    this.#fzTracking.track(
      posCheckoutModalAmountEntered({
        amount,
        checkoutSessionId: this.#checkoutSessionId,
        payRemaining,
        remainingAmount,
      }),
    );
  }

  trackPayRemainingToggled(payRemaining: boolean, remainingAmount: number): void {
    this.#fzTracking.track(
      posCheckoutModalPayRemainingToggled({
        checkoutSessionId: this.#checkoutSessionId,
        payRemaining,
        remainingAmount,
      }),
    );
  }

  trackMethodSelected(params: {
    paymentMethod: string;
    availableMethods: string[];
    flowType: CheckoutFlowType | null;
    legIndex: number;
  }): void {
    this.#fzTracking.track(
      posCheckoutModalMethodSelected({
        availableMethods: params.availableMethods,
        checkoutSessionId: this.#checkoutSessionId,
        flowType: params.flowType,
        legIndex: params.legIndex,
        paymentMethod: params.paymentMethod,
      }),
    );
  }

  trackTerminalSelected(terminalId: string, paymentMethod: string | null): void {
    this.#fzTracking.track(
      posCheckoutModalTerminalSelected({
        checkoutSessionId: this.#checkoutSessionId,
        paymentMethod,
        terminalId,
      }),
    );
  }

  trackCalculatorOpened(legAmount: number, sourceStep: CheckoutStepId | null): void {
    this.#fzTracking.track(
      posCheckoutModalCalculatorOpened({
        checkoutSessionId: this.#checkoutSessionId,
        legAmount,
        sourceStep,
      }),
    );
  }

  trackCalculatorClosed(legAmount: number, sourceStep: CheckoutStepId | null): void {
    this.#fzTracking.track(
      posCheckoutModalCalculatorClosed({
        checkoutSessionId: this.#checkoutSessionId,
        legAmount,
        sourceStep,
      }),
    );
  }

  trackHistoryViewed(legsCompleted: number, paidAmount: number): void {
    this.#fzTracking.track(
      posCheckoutModalHistoryViewed({
        checkoutSessionId: this.#checkoutSessionId,
        legsCompleted,
        paidAmount,
      }),
    );
  }

  trackPaymentStarted(params: {
    flowType: CheckoutFlowType | null;
    paymentMethod: string;
    legIndex: number;
    legAmount: number;
    isResend: boolean;
    isSplit: boolean;
    remainingBefore: number;
  }): void {
    this.#fzTracking.track(
      posCheckoutModalPaymentStarted({
        checkoutSessionId: this.#checkoutSessionId,
        flowType: params.flowType,
        isResend: params.isResend,
        isSplit: params.isSplit,
        legAmount: params.legAmount,
        legIndex: params.legIndex,
        paymentMethod: params.paymentMethod,
        remainingBefore: params.remainingBefore,
      }),
    );
  }

  trackPaymentSucceeded(params: {
    flowType: CheckoutFlowType | null;
    paymentMethod: string | null;
    legIndex: number;
    legAmount: number;
    isResend: boolean;
    isSplit: boolean;
    legsCompleted: number;
    paidAmount: number;
    remainingAfter: number;
    isLastLeg: boolean;
  }): void {
    if (params.paymentMethod !== null) {
      this.#methodSequence = [...this.#methodSequence, params.paymentMethod];
    }
    this.#fzTracking.track(
      posCheckoutModalPaymentSucceeded({
        checkoutSessionId: this.#checkoutSessionId,
        flowType: params.flowType,
        isLastLeg: params.isLastLeg,
        isResend: params.isResend,
        isSplit: params.isSplit,
        legAmount: params.legAmount,
        legIndex: params.legIndex,
        legsCompleted: params.legsCompleted,
        paidAmount: params.paidAmount,
        paymentMethod: params.paymentMethod,
        remainingAfter: params.remainingAfter,
      }),
    );
  }

  trackPaymentFailed(params: {
    failureReason: string | null;
    sessionPaidAmount: number;
    isResend: boolean;
    paymentMethod: string | null;
  }): void {
    this.#fzTracking.track(
      posCheckoutModalPaymentFailed({
        checkoutSessionId: this.#checkoutSessionId,
        failureReason: params.failureReason,
        isResend: params.isResend,
        paymentMethod: params.paymentMethod,
        sessionPaidAmount: params.sessionPaidAmount,
      }),
    );
  }

  trackPaymentRetried(previousFailureReason: string | null, paymentMethod: string | null): void {
    this.#fzTracking.track(
      posCheckoutModalPaymentRetried({
        checkoutSessionId: this.#checkoutSessionId,
        paymentMethod,
        previousFailureReason,
      }),
    );
  }

  trackPaymentMethodChangedAfterFail(previousMethod: string | null, failureReason: string | null): void {
    this.#fzTracking.track(
      posCheckoutModalPaymentMethodChangedAfterFail({
        checkoutSessionId: this.#checkoutSessionId,
        failureReason,
        previousMethod,
      }),
    );
  }

  trackLegCancelled(params: { legIndex: number; hadPriorLegs: boolean; outcomeAfter: 'method_selection' | 'modal_closed' }): void {
    this.#fzTracking.track(
      posCheckoutModalLegCancelled({
        checkoutSessionId: this.#checkoutSessionId,
        hadPriorLegs: params.hadPriorLegs,
        legIndex: params.legIndex,
        outcomeAfter: params.outcomeAfter,
      }),
    );
  }

  markPaymentLinkSent(): void {
    this.#paymentLinkSent = true;
  }

  trackSessionCancelStarted(fromStepId: CheckoutStepId | null, paidAmount: number, legsCompleted: number): void {
    this.#fzTracking.track(
      posCheckoutModalSessionCancelStarted({
        checkoutSessionId: this.#checkoutSessionId,
        fromStepId,
        legsCompleted,
        paidAmount,
      }),
    );
  }

  trackSessionCancelSucceeded(paidAmount: number, legsCompleted: number): void {
    this.#sessionCancelSucceeded = true;
    this.#fzTracking.track(
      posCheckoutModalSessionCancelSucceeded({
        checkoutSessionId: this.#checkoutSessionId,
        legsCompleted,
        paidAmount,
      }),
    );
  }

  trackSessionCancelFailed(cancelFailureReason: string | null): void {
    this.#fzTracking.track(
      posCheckoutModalSessionCancelFailed({
        cancelFailureReason,
        checkoutSessionId: this.#checkoutSessionId,
        retryCount: this.#cancelRetryCount,
      }),
    );
  }

  trackSessionCancelRetried(previousReason: string | null): void {
    this.#cancelRetryCount += 1;
    this.#fzTracking.track(
      posCheckoutModalSessionCancelRetried({
        checkoutSessionId: this.#checkoutSessionId,
        previousReason,
        retryCount: this.#cancelRetryCount,
      }),
    );
  }

  trackFlowChanged(params: {
    fromFlowType: CheckoutFlowType | null;
    toStep: CheckoutStepId | null;
    paymentStarted: boolean;
    legsCompleted: number;
  }): void {
    this.#fzTracking.track(
      posCheckoutModalFlowChanged({
        checkoutSessionId: this.#checkoutSessionId,
        fromFlowType: params.fromFlowType,
        legsCompleted: params.legsCompleted,
        paymentStarted: params.paymentStarted,
        toStep: params.toStep,
      }),
    );
  }

  trackBack(fromStepId: CheckoutStepId | null, toStepId: CheckoutStepId | null): void {
    this.#fzTracking.track(
      posCheckoutModalBack({
        checkoutSessionId: this.#checkoutSessionId,
        fromStepId,
        toStepId,
      }),
    );
  }

  #emptySnapshot(): CheckoutModalTrackingSnapshot {
    return {
      availableMethods: [],
      cancelFailureReason: null,
      cartTotal: 0,
      currency: 'EUR',
      currentSplitIndex: 0,
      flowType: null,
      hadRecordedPayments: false,
      history: [],
      itemCount: 0,
      legAmount: null,
      legsCompleted: 0,
      paidAmount: 0,
      paymentFailureReason: null,
      paymentStarted: false,
      payRemaining: false,
      remainingAmount: 0,
      resendRequested: false,
      selectedItemCount: 0,
      selectedMethod: null,
      sessionPaidAmount: 0,
      splitCount: 0,
      transactionsCount: 0,
    };
  }
}
