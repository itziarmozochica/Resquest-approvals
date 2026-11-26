import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { posCheckoutModalAmountEntered } from './events/pos-checkout-modal-amount-entered.event';
import { posCheckoutModalBack } from './events/pos-checkout-modal-back.event';
import { posCheckoutModalCalculatorClosed } from './events/pos-checkout-modal-calculator-closed.event';
import { posCheckoutModalCalculatorOpened } from './events/pos-checkout-modal-calculator-opened.event';
import { posCheckoutModalClosed } from './events/pos-checkout-modal-closed.event';
import { posCheckoutModalFlowChanged } from './events/pos-checkout-modal-flow-changed.event';
import { posCheckoutModalFlowSelected } from './events/pos-checkout-modal-flow-selected.event';
import { posCheckoutModalHistoryViewed } from './events/pos-checkout-modal-history-viewed.event';
import { posCheckoutModalItemsSelected } from './events/pos-checkout-modal-items-selected.event';
import { posCheckoutModalLegCancelled } from './events/pos-checkout-modal-leg-cancelled.event';
import { posCheckoutModalMethodSelected } from './events/pos-checkout-modal-method-selected.event';
import { posCheckoutModalOpened } from './events/pos-checkout-modal-opened.event';
import { posCheckoutModalPayRemainingToggled } from './events/pos-checkout-modal-pay-remaining-toggled.event';
import { posCheckoutModalPaymentFailed } from './events/pos-checkout-modal-payment-failed.event';
import { posCheckoutModalPaymentMethodChangedAfterFail } from './events/pos-checkout-modal-payment-method-changed-after-fail.event';
import { posCheckoutModalPaymentRetried } from './events/pos-checkout-modal-payment-retried.event';
import { posCheckoutModalPaymentStarted } from './events/pos-checkout-modal-payment-started.event';
import { posCheckoutModalPaymentSucceeded } from './events/pos-checkout-modal-payment-succeeded.event';
import { posCheckoutModalSessionCancelFailed } from './events/pos-checkout-modal-session-cancel-failed.event';
import { posCheckoutModalSessionCancelRetried } from './events/pos-checkout-modal-session-cancel-retried.event';
import { posCheckoutModalSessionCancelStarted } from './events/pos-checkout-modal-session-cancel-started.event';
import { posCheckoutModalSessionCancelSucceeded } from './events/pos-checkout-modal-session-cancel-succeeded.event';
import { posCheckoutModalSessionSnapshot } from './events/pos-checkout-modal-session-snapshot.event';
import { posCheckoutModalSplitConfigured } from './events/pos-checkout-modal-split-configured.event';
import { posCheckoutModalStepTransitioned } from './events/pos-checkout-modal-step-transitioned.event';
import { posCheckoutModalTerminalSelected } from './events/pos-checkout-modal-terminal-selected.event';
import { checkoutFlowTypeAnalyticsLabel } from './utils/checkout-flow-type-analytics-label.util';

/**
 * Mixpanel mappers for the checkout multi-step modal (`pos.checkout.modal.*`).
 * These are UX/journey events scoped to the modal host. They intentionally do not replace
 * OSS purchase-pipeline events (`pos.checkout.payment.*`) — use `checkoutSessionId` to join.
 */
export const checkoutModalMixpanelMappers = mixpanelMapper([
  {
    event: posCheckoutModalOpened,
    name: 'FZ|POS|Checkout|Modal|Opened',
    properties: ({ availableMethods, cartTotal, checkoutSessionId, itemCount, ...rest }) => ({
      available_methods: availableMethods,
      cart_total: cartTotal,
      checkout_session_id: checkoutSessionId,
      item_count: itemCount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalClosed,
    name: 'FZ|POS|Checkout|Modal|Closed',
    properties: ({
      checkoutSessionId,
      durationMs,
      flowType,
      hadRecordedPayments,
      lastStepId,
      legsCompleted,
      paidAmount,
      remainingAmount,
      stepCount,
      ...rest
    }) => ({
      checkout_session_id: checkoutSessionId,
      duration_ms: durationMs,
      flow_type: checkoutFlowTypeAnalyticsLabel(flowType),
      had_recorded_payments: hadRecordedPayments,
      last_step_id: lastStepId,
      legs_completed: legsCompleted,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      step_count: stepCount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalFlowSelected,
    name: 'FZ|POS|Checkout|Modal|Flow_Selected',
    properties: ({ checkoutSessionId, flowType, fromFlowType, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      flow_type: checkoutFlowTypeAnalyticsLabel(flowType),
      from_flow_type: checkoutFlowTypeAnalyticsLabel(fromFlowType),
      ...rest,
    }),
  },
  {
    event: posCheckoutModalSplitConfigured,
    name: 'FZ|POS|Checkout|Modal|Split_Configured',
    properties: ({ cartTotal, checkoutSessionId, splitCount, ...rest }) => ({
      cart_total: cartTotal,
      checkout_session_id: checkoutSessionId,
      split_count: splitCount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalItemsSelected,
    name: 'FZ|POS|Checkout|Modal|Items_Selected',
    properties: ({ checkoutSessionId, payRemaining, selectedAmount, selectedItemCount, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      pay_remaining: payRemaining,
      selected_amount: selectedAmount,
      selected_item_count: selectedItemCount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalAmountEntered,
    name: 'FZ|POS|Checkout|Modal|Amount_Entered',
    properties: ({ checkoutSessionId, payRemaining, remainingAmount, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      pay_remaining: payRemaining,
      remaining_amount: remainingAmount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalPayRemainingToggled,
    name: 'FZ|POS|Checkout|Modal|Pay_Remaining_Toggled',
    properties: ({ checkoutSessionId, payRemaining, remainingAmount, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      pay_remaining: payRemaining,
      remaining_amount: remainingAmount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalMethodSelected,
    name: 'FZ|POS|Checkout|Modal|Method_Selected',
    properties: ({ availableMethods, checkoutSessionId, flowType, legIndex, paymentMethod, ...rest }) => ({
      available_methods: availableMethods,
      checkout_session_id: checkoutSessionId,
      flow_type: checkoutFlowTypeAnalyticsLabel(flowType),
      leg_index: legIndex,
      payment_method: paymentMethod,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalTerminalSelected,
    name: 'FZ|POS|Checkout|Modal|Terminal_Selected',
    properties: ({ checkoutSessionId, paymentMethod, terminalId, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      payment_method: paymentMethod,
      terminal_id: terminalId,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalCalculatorOpened,
    name: 'FZ|POS|Checkout|Modal|Calculator_Opened',
    properties: ({ checkoutSessionId, legAmount, sourceStep, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      leg_amount: legAmount,
      source_step: sourceStep,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalCalculatorClosed,
    name: 'FZ|POS|Checkout|Modal|Calculator_Closed',
    properties: ({ checkoutSessionId, legAmount, sourceStep, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      leg_amount: legAmount,
      source_step: sourceStep,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalHistoryViewed,
    name: 'FZ|POS|Checkout|Modal|History_Viewed',
    properties: ({ checkoutSessionId, legsCompleted, paidAmount, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      legs_completed: legsCompleted,
      paid_amount: paidAmount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalPaymentStarted,
    name: 'FZ|POS|Checkout|Modal|Payment_Started',
    properties: ({ checkoutSessionId, flowType, isResend, isSplit, legAmount, legIndex, paymentMethod, remainingBefore, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      flow_type: checkoutFlowTypeAnalyticsLabel(flowType),
      is_resend: isResend,
      is_split: isSplit,
      leg_amount: legAmount,
      leg_index: legIndex,
      payment_method: paymentMethod,
      remaining_before: remainingBefore,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalPaymentSucceeded,
    name: 'FZ|POS|Checkout|Modal|Payment_Succeeded',
    properties: ({
      checkoutSessionId,
      flowType,
      isLastLeg,
      isResend,
      isSplit,
      legAmount,
      legIndex,
      legsCompleted,
      paidAmount,
      paymentMethod,
      remainingAfter,
      ...rest
    }) => ({
      checkout_session_id: checkoutSessionId,
      flow_type: checkoutFlowTypeAnalyticsLabel(flowType),
      is_last_leg: isLastLeg,
      is_resend: isResend,
      is_split: isSplit,
      leg_amount: legAmount,
      leg_index: legIndex,
      legs_completed: legsCompleted,
      paid_amount: paidAmount,
      payment_method: paymentMethod,
      remaining_after: remainingAfter,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalPaymentFailed,
    name: 'FZ|POS|Checkout|Modal|Payment_Failed',
    properties: ({ checkoutSessionId, failureReason, isResend, paymentMethod, sessionPaidAmount, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      failure_reason: failureReason,
      is_resend: isResend,
      payment_method: paymentMethod,
      session_paid_amount: sessionPaidAmount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalPaymentRetried,
    name: 'FZ|POS|Checkout|Modal|Payment_Retried',
    properties: ({ checkoutSessionId, paymentMethod, previousFailureReason, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      payment_method: paymentMethod,
      previous_failure_reason: previousFailureReason,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalPaymentMethodChangedAfterFail,
    name: 'FZ|POS|Checkout|Modal|Payment_Method_Changed_After_Fail',
    properties: ({ checkoutSessionId, failureReason, previousMethod, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      failure_reason: failureReason,
      previous_method: previousMethod,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalLegCancelled,
    name: 'FZ|POS|Checkout|Modal|Leg_Cancelled',
    properties: ({ checkoutSessionId, hadPriorLegs, legIndex, outcomeAfter, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      had_prior_legs: hadPriorLegs,
      leg_index: legIndex,
      outcome_after: outcomeAfter,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalSessionCancelStarted,
    name: 'FZ|POS|Checkout|Modal|Session_Cancel_Started',
    properties: ({ checkoutSessionId, fromStepId, legsCompleted, paidAmount, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      from_step_id: fromStepId,
      legs_completed: legsCompleted,
      paid_amount: paidAmount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalSessionCancelSucceeded,
    name: 'FZ|POS|Checkout|Modal|Session_Cancel_Succeeded',
    properties: ({ checkoutSessionId, legsCompleted, paidAmount, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      legs_completed: legsCompleted,
      paid_amount: paidAmount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalSessionCancelFailed,
    name: 'FZ|POS|Checkout|Modal|Session_Cancel_Failed',
    properties: ({ cancelFailureReason, checkoutSessionId, retryCount, ...rest }) => ({
      cancel_failure_reason: cancelFailureReason,
      checkout_session_id: checkoutSessionId,
      retry_count: retryCount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalSessionCancelRetried,
    name: 'FZ|POS|Checkout|Modal|Session_Cancel_Retried',
    properties: ({ checkoutSessionId, previousReason, retryCount, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      previous_reason: previousReason,
      retry_count: retryCount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalFlowChanged,
    name: 'FZ|POS|Checkout|Modal|Flow_Changed',
    properties: ({ checkoutSessionId, fromFlowType, legsCompleted, paymentStarted, toStep, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      from_flow_type: checkoutFlowTypeAnalyticsLabel(fromFlowType),
      legs_completed: legsCompleted,
      payment_started: paymentStarted,
      to_step: toStep,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalBack,
    name: 'FZ|POS|Checkout|Modal|Back',
    properties: ({ checkoutSessionId, fromStepId, toStepId, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      from_step_id: fromStepId,
      to_step_id: toStepId,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalStepTransitioned,
    name: 'FZ|POS|Checkout|Modal|Step_Transitioned',
    properties: ({
      cancelFailureReason,
      checkoutSessionId,
      currentSplitIndex,
      elapsedMs,
      flowType,
      fromStepId,
      hadRecordedPayments,
      historyDepth,
      legAmount,
      navigationKind,
      paidAmount,
      paymentFailureReason,
      paymentStarted,
      payRemaining,
      remainingAmount,
      resendRequested,
      selectedItemCount,
      selectedMethod,
      splitCount,
      toStepId,
      transactionsCount,
      ...rest
    }) => ({
      cancel_failure_reason: cancelFailureReason,
      checkout_session_id: checkoutSessionId,
      current_split_index: currentSplitIndex,
      elapsed_ms: elapsedMs,
      flow_type: checkoutFlowTypeAnalyticsLabel(flowType),
      from_step_id: fromStepId,
      had_recorded_payments: hadRecordedPayments,
      history_depth: historyDepth,
      leg_amount: legAmount,
      navigation_kind: navigationKind,
      paid_amount: paidAmount,
      payment_failure_reason: paymentFailureReason,
      payment_started: paymentStarted,
      pay_remaining: payRemaining,
      remaining_amount: remainingAmount,
      resend_requested: resendRequested,
      selected_item_count: selectedItemCount,
      selected_method: selectedMethod,
      split_count: splitCount,
      to_step_id: toStepId,
      transactions_count: transactionsCount,
      ...rest,
    }),
  },
  {
    event: posCheckoutModalSessionSnapshot,
    name: 'FZ|POS|Checkout|Modal|Session_Snapshot',
    properties: ({ checkoutSessionId, durationMs, flowType, legsCompleted, methodSequence, ...rest }) => ({
      checkout_session_id: checkoutSessionId,
      duration_ms: durationMs,
      flow_type: checkoutFlowTypeAnalyticsLabel(flowType),
      legs_completed: legsCompleted,
      method_sequence: methodSequence,
      ...rest,
    }),
  },
]);
