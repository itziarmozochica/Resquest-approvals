import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import type { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { PaymentConfigStorageService } from '@fz-original/app/modules/box-office/shared/services/payment/payment-config-storage.service';
import { Money } from '@fz-original/app/shared/models/money.model';
import type { MultiStepModalResult, MultiStepStepConfig } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { withMultiStepNavigation } from '@fz-original/app/shared/multi-step-modal/store/with-multi-step-navigation.feature';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, type IgntDialogRef } from '@ignite/common';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { EMPTY, type Observable, type Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { resolveCheckoutFlow } from '../config/checkout-modal-flows';
import type { CheckoutCartItem } from '../models/checkout-cart-item.model';
import type { CheckoutPaymentLinkResult } from '../models/checkout-payment-link.model';
import { CHECKOUT_PAYMENT_PORT, type CheckoutPaymentResult, type CheckoutSessionCancelResult } from '../models/checkout-payment-port.model';
import {
  DEFAULT_CHECKOUT_FLOW_TYPES,
  type CheckoutContext,
  type CheckoutFlowType,
  type CheckoutIntent,
  type CheckoutModalData,
  type CheckoutStepId,
} from '../models/checkout.model';
import type { CheckoutTransactionRecord } from '../models/transaction-history.model';
import { CheckoutLegOutcomeService } from '../services/checkout-leg-outcome/checkout-leg-outcome.service';
import { CheckoutModalTrackingService } from '../tracking/services/checkout-modal-tracking.service';
import { buildCheckoutModalTrackingSnapshot } from '../tracking/utils/checkout-modal-tracking-snapshot.util';
import { buildPlaceholderCheckoutCartItems, reconcileCartItemsToTotal, sumCartItemCents } from '../utils/checkout-cart-items.util';
import { reportsCashTendered, resolveCashLegAmount, resolveCashSplitLegIndex } from '../utils/checkout-cash-tendered.util';
import { resolvePaymentLinkDefaultDuration, resolvePaymentLinkExpiresAt } from '../utils/checkout-payment-link.util';
import {
  findCheckoutMethodDescriptor,
  findSelectedCheckoutMethodDescriptor,
  isDelegatedCheckoutMethod,
  isTapToPayCheckoutPayment,
} from '../utils/checkout-payment.util';
import {
  equalSplitAmountCents,
  fromCents,
  remainingBalanceCents,
  resolveCurrentLegAmountCents,
  toCents,
} from '../utils/checkout-split.util';
import { buildCheckoutTransactionRecord, countCompletedCheckoutTransactions } from '../utils/checkout-transaction-history.util';
import { initialCheckoutState, type CheckoutStoreState } from './checkout-store.model';

function filterUnpaidCartItems(cartItems: CheckoutCartItem[], paidItemIds: string[]): CheckoutCartItem[] {
  const paidSet = new Set(paidItemIds);
  return cartItems.filter(item => !paidSet.has(item.id));
}

export const CheckoutStore = signalStore(
  withState<CheckoutStoreState>(initialCheckoutState),
  withMultiStepNavigation<CheckoutContext, CheckoutStepId, CheckoutIntent>(),
  withComputed(store => {
    const currency = computed<string>(() => store.context().cartTotal?.currency ?? 'EUR');
    const paidAmount = computed<Money>(() => new Money(store.context().paidAmount?.amount ?? 0, currency()));
    const remainingAmount = computed<Money>(() => {
      const total = store.context().cartTotal?.amount ?? 0;
      return new Money(Math.max(fromCents(remainingBalanceCents(total, paidAmount().amount)), 0), currency());
    });
    const perSplitAmount = computed<Money>(() => {
      const { currentSplitIndex, splitCount } = store.context();
      const remainingPeople = splitCount - currentSplitIndex;
      return new Money(fromCents(equalSplitAmountCents(toCents(remainingAmount().amount), remainingPeople)), currency());
    });
    const currentSplitAmount = computed<Money>(() => {
      return new Money(fromCents(resolveCurrentLegAmountCents(store.context())), currency());
    });
    return {
      currentSplitAmount,
      currentSplitNumber: computed<number>(() => store.context().currentSplitIndex + 1),
      isDelegatedPayment: computed<boolean>(() => isDelegatedCheckoutMethod(store.context())),
      isLastSplit: computed<boolean>(() => {
        const { currentSplitIndex, flowType, splitCount } = store.context();
        const amountCoversRemaining = toCents(currentSplitAmount().amount) >= toCents(remainingAmount().amount);
        if (flowType === 'customSplit' || flowType === 'customAmount') {
          return amountCoversRemaining;
        }
        return currentSplitIndex + 1 >= splitCount || amountCoversRemaining;
      }),
      isSplitFlow: computed<boolean>(() => {
        const { flowType } = store.context();
        return flowType === 'splitEqually' || flowType === 'customSplit' || flowType === 'customAmount';
      }),
      isTapToPayPayment: computed<boolean>(() => isTapToPayCheckoutPayment(store.context())),
      paidAmount,
      perSplitAmount,
      remainingAmount,
      summaryToPayLabelKey: computed<string>(() => {
        const { flowType } = store.context();
        if (flowType === 'customSplit' || flowType === 'customAmount') return 'checkout.split.summary.toPayCustom';
        if (flowType === 'splitEqually') return 'checkout.split.summary.toPayEqually';
        return 'checkout.split.summary.toPayEqually';
      }),
      unpaidCartItems: computed<CheckoutCartItem[]>(() => {
        const { cartItems, paidItemIds } = store.context();
        return filterUnpaidCartItems(cartItems, paidItemIds);
      }),
    };
  }),
  withMethods(store => {
    const dialogData = inject<CheckoutModalData | null>(IGNT_DIALOG_DATA, { optional: true });
    const dialogRef = inject<IgntDialogRef<MultiStepModalResult> | null>(IGNT_DIALOG_REF, { optional: true });
    const paymentConfigStorageService = inject(PaymentConfigStorageService);
    const paymentPort = inject(CHECKOUT_PAYMENT_PORT, { optional: true });
    const tracking = inject(CheckoutModalTrackingService, { optional: true });
    const trackingSnapshot = () =>
      buildCheckoutModalTrackingSnapshot({
        context: store.context(),
        currentSplitAmount: store.currentSplitAmount().amount,
        history: store.history(),
        remainingAmount: store.remainingAmount().amount,
      });
    const closeAsCompleted = (): void => {
      dialogRef?.close({ completed: true });
    };
    const selectCartItems = (selectedItemIds: string[]): void => {
      const context = store.context();
      const currency = context.cartTotal?.currency ?? 'EUR';
      const selectedCents = sumCartItemCents(context.cartItems, selectedItemIds);
      const chargeableCents = Math.min(selectedCents, toCents(store.remainingAmount().amount));
      patchState(store, {
        context: {
          ...context,
          payRemaining: false,
          selectedItemIds,
          splitAmountOverride: chargeableCents > 0 ? new Money(fromCents(chargeableCents), currency) : null,
        },
      });
    };
    return {
      advanceAfterSplitSuccess(): void {
        if (toCents(store.remainingAmount().amount) <= 0) {
          closeAsCompleted();
          return;
        }
        store.transition('next' as CheckoutIntent);
      },
      cancelCurrentSplit(): void {
        const context = store.context();
        const hasPaidAmount = toCents(context.paidAmount?.amount ?? 0) > 0;
        tracking?.trackLegCancelled({
          hadPriorLegs: hasPaidAmount || countCompletedCheckoutTransactions(context.transactions) > 0,
          legIndex: context.currentSplitIndex,
          outcomeAfter: 'method_selection',
        });
        patchState(store, {
          context: { ...context, paymentStarted: hasPaidAmount },
        });
        store.transition('cancelSplit' as CheckoutIntent);
      },
      cancelPayment(): void {
        const context = store.context();
        // First-leg (or pay-in-full) cancel unwinds the modal — emit once here, not from
        // `cancelPaymentLeg`, which only aborts the in-flight port request before this runs.
        tracking?.trackLegCancelled({
          hadPriorLegs: countCompletedCheckoutTransactions(context.transactions) > 0 || toCents(context.paidAmount?.amount ?? 0) > 0,
          legIndex: context.currentSplitIndex,
          outcomeAfter: 'modal_closed',
        });
        paymentPort?.cancel();
        dialogRef?.close({ completed: false });
      },
      cancelPaymentLeg(): void {
        paymentPort?.cancelLeg();
      },
      cancelTapToPayPayment(): void {
        if (store.context().tapToPayCancelRequested) {
          return;
        }
        patchState(store, { context: { ...store.context(), tapToPayCancelRequested: true } });
        paymentPort?.cancelLeg();
      },
      completeCheckout(): void {
        closeAsCompleted();
      },
      completeSplit(paymentId?: string): void {
        const context = store.context();
        const currency = context.cartTotal?.currency ?? 'EUR';
        const splitAmount = store.currentSplitAmount();
        const wasResend = context.activePaymentResend ?? false;
        const isLastLeg = store.isLastSplit();
        const paidCents = toCents(context.paidAmount?.amount ?? 0) + toCents(splitAmount.amount);
        const unpaidItemIds = filterUnpaidCartItems(context.cartItems, context.paidItemIds).map(item => item.id);
        const newlyPaidItemIds = context.payRemaining ? unpaidItemIds : context.selectedItemIds;
        // Every split flow records its legs (amount + method) so the transaction history shows
        // what was actually charged, driven or simulated alike.
        const legRecord: CheckoutTransactionRecord | null = store.isSplitFlow()
          ? buildCheckoutTransactionRecord({ amount: splitAmount, context, paymentId, status: 'completed' })
          : null;
        patchState(store, {
          context: {
            ...context,
            currentSplitIndex: context.currentSplitIndex + 1,
            paidAmount: new Money(fromCents(paidCents), currency),
            paidItemIds: [...context.paidItemIds, ...newlyPaidItemIds],
            payRemaining: false,
            selectedItemIds: [],
            splitAmountOverride: null,
            transactions: legRecord === null ? context.transactions : [...context.transactions, legRecord],
          },
        });
        tracking?.trackPaymentSucceeded({
          flowType: store.context().flowType,
          isLastLeg,
          isResend: wasResend,
          isSplit: store.isSplitFlow(),
          legAmount: splitAmount.amount,
          legIndex: context.currentSplitIndex,
          legsCompleted: countCompletedCheckoutTransactions(store.context().transactions),
          paidAmount: store.context().paidAmount?.amount ?? 0,
          paymentMethod: context.selectedMethod === null ? null : String(context.selectedMethod),
          remainingAfter: store.remainingAmount().amount,
        });
        store.transition('paid' as CheckoutIntent);
      },
      configureEqualSplits(count: number): void {
        const context = store.context();
        const currency = context.cartTotal?.currency ?? 'EUR';
        patchState(store, {
          context: {
            ...context,
            currentSplitIndex: 0,
            paidAmount: new Money(0, currency),
            payRemaining: false,
            splitAmountOverride: null,
            splitCount: count,
          },
        });
        tracking?.trackSplitConfigured(count, context.cartTotal?.amount ?? 0);
      },
      hasRealPayment(): boolean {
        return paymentPort?.isDriven() ?? false;
      },
      /** Moves from the cancelling step to the retryable cancel-failed step (cancel-and-refund failed). */
      markCancellationFailed(reason?: string): void {
        patchState(store, { context: { ...store.context(), cancelFailureReason: reason ?? null } });
        tracking?.trackSessionCancelFailed(reason ?? null);
        store.transition('cancelFailed' as CheckoutIntent);
      },
      /** Moves from the cancelling step to the cancel-confirmation step (session cancelled and refunded). */
      markCancellationSucceeded(): void {
        const snapshot = trackingSnapshot();
        tracking?.trackSessionCancelSucceeded(snapshot.paidAmount, snapshot.legsCompleted);
        store.transition('cancelSucceeded' as CheckoutIntent);
      },
      /**
       * Lands the modal on the pre-charge failure screen (B2BO-8855): the purchase failed before any
       * money was taken (a rejected coupon or gift card, a cart-preparation error), so — unlike
       * `markPaymentFailed` — no payment attempt is recorded and the modal offers a return to the
       * payment methods instead of a resend. `reason` is kept for the failure-message wiring
       * (B2BO-8854); the step's own copy is generic, except for the Tap to Pay reasons, which are
       * their own message keys.
       */
      markCheckoutFailed(reason?: string): void {
        patchState(store, { context: { ...store.context(), legInFlight: false, paymentFailureReason: reason ?? null } });
        store.transition('checkoutFailed' as CheckoutIntent);
      },
      markPaid(paymentId?: string): void {
        const context = store.context();
        const currency = context.cartTotal?.currency ?? 'EUR';
        const paidTotal = context.cartTotal?.amount ?? store.currentSplitAmount().amount;
        tracking?.trackPaymentSucceeded({
          flowType: context.flowType,
          isLastLeg: true,
          isResend: context.activePaymentResend ?? false,
          isSplit: store.isSplitFlow(),
          legAmount: store.currentSplitAmount().amount,
          legIndex: context.currentSplitIndex,
          legsCompleted: countCompletedCheckoutTransactions(context.transactions) + (store.isSplitFlow() ? 0 : 1),
          paidAmount: paidTotal,
          paymentMethod: context.selectedMethod === null ? null : String(context.selectedMethod),
          remainingAfter: 0,
        });
        const legRecord: CheckoutTransactionRecord | null = buildCheckoutTransactionRecord({
          amount: new Money(paidTotal, currency),
          context,
          paymentId,
          status: 'completed',
        });
        patchState(store, {
          context: {
            ...context,
            paidAmount: new Money(paidTotal, currency),
            paidItemIds: context.cartItems.map(item => item.id),
            transactions: legRecord === null ? context.transactions : [...context.transactions, legRecord],
          },
        });
        store.transition('paid' as CheckoutIntent);
      },
      /**
       * `sessionPaidAmount` (major units) is the driver-reported amount actually captured on the
       * session when the failure happened after the money was collected (booking failure on a
       * fully paid session). It is recorded separately from `paidAmount` — which keeps driving the
       * split loop's remaining-balance math — so the cancel-checkout gate can see the capture even
       * when no completed split recorded it (single leg covering the whole cart).
       */
      markPaymentFailed(reason?: string, sessionPaidAmount?: number, paymentId?: string, resendBlocked = false): void {
        const context = store.context();
        const currency = context.cartTotal?.currency ?? 'EUR';
        // Record the failed attempt so the history timeline surfaces it with the failed styling. The
        // amount mirrors what the leg tried to charge (the split amount for split flows, the cart
        // total otherwise) — the same value `requestPayment`/`markPaid` drive. Attempts with no
        // chosen method are not recorded, matching the completed-leg paths; cancelled attempts are
        // never recorded here. The failed status keeps it out of the "legs completed" count.
        const failedAmount = store.isSplitFlow()
          ? store.currentSplitAmount()
          : new Money(context.cartTotal?.amount ?? store.currentSplitAmount().amount, currency);
        const failedRecord: CheckoutTransactionRecord | null = buildCheckoutTransactionRecord({
          amount: failedAmount,
          context,
          failureReason: reason,
          paymentId,
          status: 'failed',
        });
        patchState(store, {
          context: {
            ...context,
            legInFlight: false,
            paymentFailureReason: reason ?? null,
            paymentResendBlocked: resendBlocked,
            sessionPaidAmount: sessionPaidAmount === undefined ? context.sessionPaidAmount : new Money(sessionPaidAmount, currency),
            transactions: failedRecord === null ? context.transactions : [...context.transactions, failedRecord],
          },
        });
        tracking?.trackPaymentFailed({
          failureReason: reason ?? null,
          isResend: context.activePaymentResend ?? false,
          paymentMethod: context.selectedMethod === null ? null : String(context.selectedMethod),
          sessionPaidAmount: sessionPaidAmount ?? context.sessionPaidAmount?.amount ?? 0,
        });
        store.transition('paymentFailed' as CheckoutIntent);
      },
      markPaymentStarted(): void {
        if (!store.context().paymentStarted) {
          patchState(store, { context: { ...store.context(), paymentStarted: true } });
        }
      },
      preselectSingleCartItem(): void {
        const context = store.context();
        const unpaidItems = store.unpaidCartItems();
        const isUntouched = context.selectedItemIds.length === 0 && !context.payRemaining && context.splitAmountOverride === null;
        if (unpaidItems.length === 1 && isUntouched) {
          selectCartItems([unpaidItems[0].id]);
        }
      },
      requestPayment(): void {
        const { resendRequested, selectedMethod } = store.context();
        if (selectedMethod != null) {
          // Split flows settle one partial leg per request; pay-in-full omits the amount and is
          // driven as a split of 1 on the purchase side. The selected option's payment path rides
          // along so the purchase side routes delegated methods (including delegated cards)
          // through the delegated APIs without re-deriving the path from the type.
          const amount = store.isSplitFlow() ? store.currentSplitAmount().amount : undefined;
          const delegated = findSelectedCheckoutMethodDescriptor(store.context())?.delegated;
          // Terminal-less integrated confirms never call `selectPaymentTerminal`, and stale clearing
          // can wipe storage when no terminals remain — seed the opener's source-aware base so the
          // purchase pipeline can route to the gateway instead of crashing on an empty Square path.
          if (delegated === false) {
            ensureIntegratedPaymentConfigurationPersisted(paymentConfigStorageService, dialogData?.basePaymentConfiguration);
          }
          tracking?.trackPaymentStarted({
            flowType: store.context().flowType,
            isResend: resendRequested,
            isSplit: store.isSplitFlow(),
            legAmount: amount ?? store.remainingAmount().amount,
            legIndex: store.context().currentSplitIndex,
            paymentMethod: String(selectedMethod),
            remainingBefore: store.remainingAmount().amount,
          });
          const context = store.context();
          const cashTenderedReported = reportsCashTendered(context);
          const cashReceived = context.calculatorReceivedAmount ?? undefined;
          paymentPort?.requestPayment({
            amount,
            delegated,
            paymentType: selectedMethod,
            retry: resendRequested,
            ...(cashTenderedReported &&
              cashReceived !== undefined &&
              cashReceived > 0 && {
                cashLegAmount: resolveCashLegAmount(context),
                cashReceived,
                splitLegIndex: resolveCashSplitLegIndex(context),
              }),
          });
          patchState(store, { context: { ...store.context(), activePaymentResend: resendRequested, resendRequested: false } });
        }
      },
      /**
       * Asks the purchase driver to cancel (and refund) the whole session with its recorded legs.
       * The outcome arrives on `sessionCancelResult$()`; the cancelling step owns the wait.
       */
      requestSessionCancel(): void {
        paymentPort?.cancelSession();
      },
      /** Re-enters the cancelling step after a failed session cancel, re-requesting the cancellation. */
      retryCancellation(): void {
        const previousReason = store.context().cancelFailureReason;
        patchState(store, { context: { ...store.context(), cancelFailureReason: null } });
        tracking?.trackSessionCancelRetried(previousReason);
        store.transition('retryCancel' as CheckoutIntent);
      },
      selectFlowType(flowType: CheckoutFlowType): void {
        const context = store.context();
        const flowChanged = context.flowType !== flowType;
        const fromFlowType = context.flowType;
        // The link is pay-in-full only: leaving the flow with it selected restores the flow's default method.
        const dropsPaymentLink = flowChanged && context.paymentLinkSelected;
        const defaultMethod = dropsPaymentLink ? resolveCheckoutFlow(dialogData).preselectMethod(context) : null;
        patchState(store, {
          context: {
            ...context,
            ...(dropsPaymentLink && {
              paymentLinkErrorKey: null,
              paymentLinkSelected: false,
              selectedMethod: defaultMethod?.type ?? null,
              selectedMethodDelegated: defaultMethod?.delegated ?? null,
            }),
            flowType,
            paymentStarted: false,
            payRemaining: flowChanged ? false : context.payRemaining,
            selectedItemIds: flowChanged ? [] : context.selectedItemIds,
            splitAmountOverride: flowChanged ? null : context.splitAmountOverride,
            splitCount: flowType === 'splitEqually' ? context.splitCount : 0,
            transactions: flowChanged ? [] : context.transactions,
          },
        });
        tracking?.trackFlowSelected(flowType, fromFlowType);
      },
      selectPaymentMethod(method: PaymentType, delegated: boolean): void {
        // (Re)selecting a method invalidates any pending resend: a confirm from method selection
        // must run the full purchase pipeline with the chosen method, never replay the old attempt.
        // `delegated` records which of the two possible paths of the type was picked (the same
        // type can be offered integrated and delegated), so a selection is always the full pair.
        const context = store.context();
        patchState(store, {
          context: {
            ...context,
            paymentLinkErrorKey: null,
            paymentLinkSelected: false,
            resendRequested: false,
            selectedMethod: method,
            selectedMethodDelegated: delegated,
          },
        });
        tracking?.trackMethodSelected({
          availableMethods: context.availableMethods.map(descriptor => String(descriptor.type)),
          flowType: context.flowType,
          legIndex: context.currentSplitIndex,
          paymentMethod: String(method),
        });
      },
      /** The link replaces the method selection: nothing is charged, so no method stays selected. */
      selectPaymentLink(): void {
        patchState(store, {
          context: { ...store.context(), paymentLinkSelected: true, selectedMethod: null, selectedMethodDelegated: null },
        });
      },
      setPaymentLinkDuration(duration: string): void {
        patchState(store, { context: { ...store.context(), paymentLinkDuration: duration, paymentLinkErrorKey: null } });
      },
      selectPaymentTerminal(terminalId: string): void {
        const context = store.context();
        patchState(store, { context: { ...store.context(), selectedTerminalId: terminalId } });
        tracking?.trackTerminalSelected(terminalId, context.selectedMethod === null ? null : String(context.selectedMethod));
        // Persist on the stored configuration only while it knows the chosen terminal; otherwise
        // on the source-aware base built by the opener — a stale stored terminal set (e.g.
        // persisted before the declarative rollout) must not survive under a terminal it does not
        // contain.
        const storedConfig = paymentConfigStorageService.getConfiguration();
        const baseConfig =
          storedConfig != null && paymentConfigurationHasTerminal(storedConfig, terminalId)
            ? storedConfig
            : (dialogData?.basePaymentConfiguration ?? storedConfig);
        if (baseConfig == null) {
          return;
        }
        const paymentConfig = baseConfig.clone();
        paymentConfig.deviceId = terminalId;
        paymentConfigStorageService.setConfiguration(paymentConfig);
      },
      sessionCancelResult$(): Observable<CheckoutSessionCancelResult> {
        return paymentPort != null ? paymentPort.sessionCancelResult$ : EMPTY;
      },
      setCalculatorReceivedAmount(amount: number | null): void {
        patchState(store, { context: { ...store.context(), calculatorReceivedAmount: amount } });
      },
      setSplitAmountOverride(amount: number | null): void {
        const context = store.context();
        const currency = context.cartTotal?.currency ?? 'EUR';
        patchState(store, {
          context: {
            ...context,
            payRemaining: false,
            selectedItemIds: [],
            splitAmountOverride: amount === null ? null : new Money(amount, currency),
          },
        });
      },
      toggleCartItem(itemId: string): void {
        const { selectedItemIds } = store.context();
        selectCartItems(selectedItemIds.includes(itemId) ? selectedItemIds.filter(id => id !== itemId) : [...selectedItemIds, itemId]);
      },
      togglePayRemaining(payRemaining: boolean): void {
        patchState(store, { context: { ...store.context(), payRemaining, selectedItemIds: [], splitAmountOverride: null } });
        tracking?.trackPayRemainingToggled(payRemaining, store.remainingAmount().amount);
      },
    };
  }),
  withMethods(store => {
    const tracking = inject(CheckoutModalTrackingService, { optional: true });
    const baseTransition = store.transition;
    const baseGoBack = store.goBack;
    const trackingSnapshot = () =>
      buildCheckoutModalTrackingSnapshot({
        context: store.context(),
        currentSplitAmount: store.currentSplitAmount().amount,
        history: store.history(),
        remainingAmount: store.remainingAmount().amount,
      });

    const resetCalculatorReceivedAmount = (): void => {
      if (store.context().calculatorReceivedAmount !== null) {
        patchState(store, { context: { ...store.context(), calculatorReceivedAmount: null } });
      }
    };

    return {
      goBack(): void {
        const fromStepId = store.currentStepId();
        baseGoBack();
        const toStepId = store.currentStepId();
        if (fromStepId === toStepId) {
          return;
        }
        if (fromStepId === 'splitProgress') {
          patchState(store, { context: { ...store.context(), pendingReturnStepId: null } });
        }
        if (fromStepId === 'calculator' || fromStepId === 'cashCapture') {
          resetCalculatorReceivedAmount();
        }
        const snapshot = trackingSnapshot();
        tracking?.trackBack(fromStepId, toStepId);
        tracking?.trackStepTransitioned({
          fromStepId,
          intent: 'back',
          navigationKind: 'back',
          snapshot,
          toStepId,
        });
        if (fromStepId === 'calculator') {
          tracking?.trackCalculatorClosed(snapshot.legAmount ?? 0, toStepId);
        }
      },
      transition(intent: CheckoutIntent): void {
        const fromStepId = store.currentStepId();
        const before = store.context();
        const historyBefore = store.history();
        baseTransition(intent);
        const toStepId = store.currentStepId();
        if (fromStepId === toStepId) {
          return;
        }
        if (fromStepId === 'splitProgress') {
          patchState(store, { context: { ...store.context(), pendingReturnStepId: null } });
        }
        const snapshot = trackingSnapshot();

        if (intent === 'changeFlow') {
          tracking?.trackFlowChanged({
            fromFlowType: before.flowType,
            legsCompleted: countCompletedCheckoutTransactions(before.transactions),
            paymentStarted: before.paymentStarted,
            toStep: toStepId,
          });
        }
        if (intent === 'confirm' && fromStepId === 'confirmCancel') {
          const cancelOriginStepId = historyBefore[historyBefore.length - 1] ?? null;
          tracking?.trackSessionCancelStarted(
            cancelOriginStepId,
            before.paidAmount?.amount ?? 0,
            countCompletedCheckoutTransactions(before.transactions),
          );
        }
        if (intent === 'changeMethod' && fromStepId === 'paymentFailed') {
          tracking?.trackPaymentMethodChangedAfterFail(
            before.selectedMethod === null ? null : String(before.selectedMethod),
            before.paymentFailureReason,
          );
        }
        if (intent === 'openCalculator') {
          resetCalculatorReceivedAmount();
          tracking?.trackCalculatorOpened(snapshot.legAmount ?? 0, fromStepId);
        }
        if (toStepId === 'cashCapture') {
          resetCalculatorReceivedAmount();
        }
        if (fromStepId === 'calculator') {
          tracking?.trackCalculatorClosed(snapshot.legAmount ?? 0, fromStepId);
        }
        if (intent === 'viewHistory') {
          tracking?.trackHistoryViewed(snapshot.legsCompleted, snapshot.paidAmount);
        }
        if (intent === 'continue' && fromStepId === 'itemSelection') {
          tracking?.trackItemsSelected(snapshot.selectedItemCount, snapshot.legAmount ?? 0, snapshot.payRemaining);
        }
        if (intent === 'continue' && fromStepId === 'amountEntry') {
          tracking?.trackAmountEntered(snapshot.legAmount ?? 0, snapshot.payRemaining, snapshot.remainingAmount);
        }
        tracking?.trackStepTransitioned({
          fromStepId,
          intent,
          navigationKind: 'transition',
          snapshot,
          toStepId,
        });
      },
    };
  }),
  withMethods(store => {
    const destroyRef = inject(DestroyRef);
    const tracking = inject(CheckoutModalTrackingService, { optional: true });
    const legOutcome = inject(CheckoutLegOutcomeService);
    let legSubscription: Subscription | null = null;

    const resolveLeg = (result: CheckoutPaymentResult): void => {
      patchState(store, { context: { ...store.context(), legInFlight: false } });
      if (store.isSplitFlow()) {
        if (result.kind === 'succeeded') {
          store.completeSplit(result.paymentId);
        } else if (result.kind === 'failed') {
          store.markPaymentFailed(result.reason, result.sessionPaidAmount, result.paymentId, result.resendBlocked);
        } else if (result.kind === 'checkoutFailed') {
          store.markCheckoutFailed(result.reason);
        } else {
          store.cancelCurrentSplit();
        }
        if (store.currentStepId() === 'splitProgress') {
          patchState(store, {
            context: { ...store.context(), pendingReturnStepId: resolveProcessingTarget(store, resolvedLegIntent(result)) },
          });
        }
        return;
      }
      if (result.kind === 'succeeded') {
        store.markPaid(result.paymentId);
      } else if (result.kind === 'failed') {
        store.markPaymentFailed(result.reason, result.sessionPaidAmount, result.paymentId, result.resendBlocked);
      } else if (result.kind === 'checkoutFailed') {
        store.markCheckoutFailed(result.reason);
      } else {
        store.cancelPayment();
      }
    };

    function startPaymentLegImpl(): void {
      store.markPaymentStarted();
      if (store.context().legInFlight) {
        return;
      }
      const isDriven = legOutcome.isDriven();
      if (!isDriven && !store.isSplitFlow()) {
        return;
      }
      patchState(store, {
        context: {
          ...store.context(),
          legInFlight: true,
          legStartedAt: Date.now(),
          pendingReturnStepId: null,
          tapToPayCancelRequested: false,
        },
      });
      legSubscription?.unsubscribe();
      legSubscription = legOutcome
        .observeLeg()
        .pipe(takeUntilDestroyed(destroyRef))
        .subscribe(result => resolveLeg(result));
      if (isDriven) {
        store.requestPayment();
      }
    }

    return {
      startPaymentLeg: startPaymentLegImpl,
      /**
       * Cancels a split leg that has no real port behind it (Storybook/tests): there is no
       * `cancelled` result coming from `result$` to drive the resolution, so the pending
       * `observeLeg()` timer must be torn down here before it can land a stale `completeSplit`.
       */
      cancelSimulatedSplitLeg(): void {
        legSubscription?.unsubscribe();
        legSubscription = null;
        resolveLeg({ kind: 'cancelled' });
      },
      retryPayment(): void {
        const context = store.context();
        tracking?.trackPaymentRetried(
          context.paymentFailureReason,
          context.selectedMethod === null ? null : String(context.selectedMethod),
        );
        patchState(store, {
          context: { ...store.context(), legInFlight: false, paymentFailureReason: null, resendRequested: true },
        });
        store.transition('retry' as CheckoutIntent);
        if (store.currentStepId() === 'processing') {
          startPaymentLegImpl();
        }
      },
      returnToPaymentProcess(): void {
        if (store.context().pendingReturnStepId === null) {
          store.goBack();
          return;
        }
        store.transition('resumeCheckout' as CheckoutIntent);
      },
    };
  }),
  withMethods(store => {
    const destroyRef = inject(DestroyRef);
    const dialogRef = inject<IgntDialogRef<MultiStepModalResult> | null>(IGNT_DIALOG_REF, { optional: true });
    const paymentPort = inject(CHECKOUT_PAYMENT_PORT, { optional: true });
    const tracking = inject(CheckoutModalTrackingService, { optional: true });

    const resolvePaymentLink = (result: CheckoutPaymentLinkResult): void => {
      if (result.kind === 'created') {
        tracking?.markPaymentLinkSent();
      }
      if (result.kind === 'created' || result.endsCheckout) {
        dialogRef?.close({ completed: false });
        return;
      }
      patchState(store, { context: { ...store.context(), paymentLinkErrorKey: result.messageKey } });
      store.transition('paymentLinkFailed');
    };

    return {
      /** Arms the outcome listener before the request: `paymentLinkResult$` does not replay. */
      startPaymentLinkRequest(): void {
        const expiresAt = resolvePaymentLinkExpiresAt(store.context().paymentLinkDuration, new Date());
        if (paymentPort === null || expiresAt === null) {
          store.transition('paymentLinkFailed');
          return;
        }
        paymentPort.paymentLinkResult$.pipe(take(1), takeUntilDestroyed(destroyRef)).subscribe(result => resolvePaymentLink(result));
        paymentPort.requestPaymentLink({ expiresAt });
      },
    };
  }),
  withHooks({
    onInit(store): void {
      const data = inject<CheckoutModalData | null>(IGNT_DIALOG_DATA, { optional: true });
      const availableFlowTypes = data?.checkoutFlows?.length ? data.checkoutFlows : DEFAULT_CHECKOUT_FLOW_TYPES;
      const baseContext: CheckoutContext = {
        ...store.context(),
        availableFlowTypes,
        availableMethods: data?.availableMethods ?? [],
        availableTerminals: data?.availableTerminals ?? [],
        cartTotal: data?.cartTotal ?? store.context().cartTotal,
        cashCaptureMode: data?.cashCaptureMode ?? store.context().cashCaptureMode,
        flowType: (data?.flow ?? 'fullCheckout') !== 'fullCheckout' ? 'full' : availableFlowTypes[0],
        locale: data?.locale ?? store.context().locale,
        paymentLink: data?.paymentLink ?? null,
        paymentLinkDuration: data?.paymentLink == null ? '' : resolvePaymentLinkDefaultDuration(data.paymentLink, new Date()),
        selectedTerminalId: data?.selectedTerminalId ?? null,
        tapToPay: data?.tapToPay ?? false,
      };

      const preselectedMethod = data?.preselectedMethod;
      const defaultMethod =
        preselectedMethod === undefined
          ? resolveCheckoutFlow(data).preselectMethod(baseContext)
          : findCheckoutMethodDescriptor(baseContext, preselectedMethod.type, preselectedMethod.delegated);
      const autoSelectsSoleTerminal = baseContext.selectedTerminalId === null && baseContext.availableTerminals.length === 1;
      const context: CheckoutContext = {
        ...baseContext,
        selectedMethod: defaultMethod?.type ?? null,
        selectedMethodDelegated: defaultMethod?.delegated ?? null,
      };

      const providedCartItems = data?.cartItems;
      const hasProvidedCartItems = providedCartItems !== undefined && providedCartItems.length > 0;
      patchState(store, {
        context: {
          ...context,
          cartItems: hasProvidedCartItems
            ? reconcileCartItemsToTotal(providedCartItems, context.cartTotal)
            : buildPlaceholderCheckoutCartItems(context),
        },
      });

      if (autoSelectsSoleTerminal) {
        store.selectPaymentTerminal(baseContext.availableTerminals[0].id);
      }

      store.initNavigation();

      const tracking = inject(CheckoutModalTrackingService, { optional: true });
      if (tracking != null) {
        const snapshot = buildCheckoutModalTrackingSnapshot({
          context: store.context(),
          currentSplitAmount: store.currentSplitAmount().amount,
          history: store.history(),
          remainingAmount: store.remainingAmount().amount,
        });
        tracking.trackOpened(snapshot);
        tracking.trackStepTransitioned({
          fromStepId: null,
          intent: null,
          navigationKind: 'enter',
          snapshot,
          toStepId: store.currentStepId(),
        });
      }
    },
  }),
);

interface CheckoutStepReader {
  context(): CheckoutContext;
  getStep(id: CheckoutStepId): MultiStepStepConfig<CheckoutContext, CheckoutStepId, CheckoutIntent>;
}

function resolveProcessingTarget(store: CheckoutStepReader, intent: CheckoutIntent): CheckoutStepId {
  const target = resolveTransitionTarget(store.getStep('processing'), intent, store.context());
  if (target === null) {
    return 'methodSelection';
  }
  if (target !== 'splitSuccess') {
    return target;
  }
  return resolveTransitionTarget(store.getStep('splitSuccess'), 'next', store.context()) ?? target;
}

function resolvedLegIntent(result: CheckoutPaymentResult): CheckoutIntent {
  if (result.kind === 'succeeded') {
    return 'paid';
  }
  if (result.kind === 'checkoutFailed') {
    return 'checkoutFailed';
  }
  return result.kind === 'failed' ? 'paymentFailed' : 'cancelSplit';
}

function resolveTransitionTarget(
  step: MultiStepStepConfig<CheckoutContext, CheckoutStepId, CheckoutIntent>,
  intent: CheckoutIntent,
  context: CheckoutContext,
): CheckoutStepId | null {
  const transition = step.transitions.find(candidate => candidate.on === intent);
  if (transition === undefined) {
    return null;
  }
  return typeof transition.target === 'function' ? transition.target(context) : transition.target;
}

/** True when the configuration's terminal-based gateway device list contains the terminal. */
function paymentConfigurationHasTerminal(configuration: PaymentConfiguration, terminalId: string): boolean {
  const deviceIds = [
    ...(configuration.adyenConfiguration?.devicesIds ?? []),
    ...(configuration.razorpayConfiguration?.devicesIds ?? []),
    ...(configuration.payhereConfiguration?.devicesIds ?? []),
  ];
  return deviceIds.includes(terminalId);
}

/**
 * Persists the opener's base payment configuration when an integrated confirm has nothing usable
 * in storage yet (no terminal was selected, or stale clearing wiped the prior entry).
 */
function ensureIntegratedPaymentConfigurationPersisted(
  paymentConfigStorageService: PaymentConfigStorageService,
  basePaymentConfiguration: PaymentConfiguration | undefined,
): void {
  if (basePaymentConfiguration?.hasCardConfig() !== true) {
    return;
  }
  const storedConfig = paymentConfigStorageService.getConfiguration();
  if (storedConfig?.hasCardConfig() === true) {
    return;
  }
  paymentConfigStorageService.setConfiguration(basePaymentConfiguration.clone());
}
