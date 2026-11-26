import type { MultiStepModalConfig } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';

import { CHECKOUT_BOOKING_SOLD_OUT_REASON } from '../models/checkout-payment-failure-reason.model';
import type { CheckoutContext, CheckoutIntent, CheckoutStepId } from '../models/checkout.model';
import {
  canConfirmCashCapture,
  canContinueCashCapture,
  canSkipCashCapture,
  requiresCashTenderedCapture,
} from '../utils/checkout-cash-tendered.util';
import { canConfirmPaymentLink } from '../utils/checkout-payment-link.util';
import { canConfirmCheckoutMethod } from '../utils/checkout-payment.util';
import { isValidCustomLegAmountCents, remainingBalanceCents, resolveCurrentLegAmountCents, toCents } from '../utils/checkout-split.util';

export type CheckoutModalConfig = MultiStepModalConfig<CheckoutContext, CheckoutStepId, CheckoutIntent>;

function hasSelectedFlow(context: CheckoutContext): boolean {
  return context.flowType !== null;
}

function isEqualSplitFlow(context: CheckoutContext): boolean {
  return context.flowType === 'splitEqually';
}

function isCustomSplitFlow(context: CheckoutContext): boolean {
  return context.flowType === 'customSplit';
}

function isCustomAmountFlow(context: CheckoutContext): boolean {
  return context.flowType === 'customAmount';
}

function isSplitFlow(context: CheckoutContext): boolean {
  return isEqualSplitFlow(context) || isCustomSplitFlow(context) || isCustomAmountFlow(context);
}

function isFullFlow(context: CheckoutContext): boolean {
  return !isSplitFlow(context);
}

function isSplitConfigValid(context: CheckoutContext): boolean {
  return context.splitCount >= 2;
}

function canEnterSplitConfig(context: CheckoutContext): boolean {
  return isEqualSplitFlow(context) && context.currentSplitIndex === 0;
}

function canEnterItemSelection(context: CheckoutContext): boolean {
  return isCustomSplitFlow(context);
}

function canGoBackToConfig(context: CheckoutContext): boolean {
  return !isEqualSplitFlow(context) || context.currentSplitIndex === 0;
}

function remainingCents(context: CheckoutContext): number {
  return remainingBalanceCents(context.cartTotal?.amount ?? 0, context.paidAmount?.amount ?? 0);
}

function canConfirmCustomAmount(context: CheckoutContext): boolean {
  if (context.payRemaining) {
    return remainingCents(context) > 0;
  }
  if (context.splitAmountOverride === null) {
    return false;
  }
  const amountCents = toCents(context.splitAmountOverride.amount);
  if (isCustomAmountFlow(context)) {
    return isValidCustomLegAmountCents(amountCents, remainingCents(context));
  }
  return amountCents > 0;
}

/** Reserved for the cash-capture step. */
export function canConfirmCalculator(context: CheckoutContext): boolean {
  return (context.calculatorReceivedAmount ?? 0) > 0;
}

function canConfirmSplitPayment(context: CheckoutContext): boolean {
  return canConfirmCheckoutMethod(context) && resolveCurrentLegAmountCents(context) > 0;
}

function hasPaymentStarted(context: CheckoutContext): boolean {
  return context.paymentStarted;
}

function hasNotStartedPayment(context: CheckoutContext): boolean {
  return !context.paymentStarted;
}

/**
 * True once money has actually been captured against the session. It drives the two cancel
 * behaviours (B2BO-7939): without recorded payments the cancel action just closes the modal
 * (reserved `cancel` intent, no backend call); with recorded payments it must go through the
 * in-modal cancellation flow (`cancelCheckout` intent → cancelling step → /cancel endpoint).
 *
 * Both accounts are read because they can diverge: `paidAmount` records the legs the modal loop
 * completed, while `sessionPaidAmount` is the driver-reported capture on a failure — on a booking
 * failure after full coverage the final leg is captured but never recorded as a completed split
 * (single leg covering the cart leaves `paidAmount` at 0), and the cancel action must still be
 * offered there.
 */
export function hasRecordedPayments(context: CheckoutContext): boolean {
  return toCents(context.paidAmount?.amount ?? 0) > 0 || toCents(context.sessionPaidAmount?.amount ?? 0) > 0;
}

export function hasNoRecordedPayments(context: CheckoutContext): boolean {
  return !hasRecordedPayments(context);
}

function hasStartedWithoutRecordedPayments(context: CheckoutContext): boolean {
  return hasPaymentStarted(context) && hasNoRecordedPayments(context);
}

/**
 * A sold-out booking ends the sale whatever the method: another method would book against the same
 * session and get the same answer, so the cashier is left with the cancellation only.
 */
function canChangeMethodAfterFailure(context: CheckoutContext): boolean {
  if (context.paymentFailureReason === CHECKOUT_BOOKING_SOLD_OUT_REASON) {
    return false;
  }
  return isSplitFlow(context) || hasNoRecordedPayments(context);
}

function isSplitFlowWithoutRecordedPayments(context: CheckoutContext): boolean {
  return isSplitFlow(context) && hasNoRecordedPayments(context);
}

function never(): boolean {
  return false;
}

function hasPendingReturn(context: CheckoutContext): boolean {
  return context.pendingReturnStepId !== null;
}

function hasNoPendingReturn(context: CheckoutContext): boolean {
  return !hasPendingReturn(context);
}

function isCartFullyPaid(context: CheckoutContext): boolean {
  return remainingCents(context) <= 0;
}

function resumeCheckoutTarget(context: CheckoutContext): CheckoutStepId {
  return context.pendingReturnStepId ?? 'methodSelection';
}

function flowSelectionTarget(context: CheckoutContext): CheckoutStepId {
  if (isCustomSplitFlow(context)) {
    return 'itemSelection';
  }
  if (isCustomAmountFlow(context)) {
    return 'amountEntry';
  }
  return isEqualSplitFlow(context) ? 'splitConfig' : 'methodSelection';
}

function paidTarget(context: CheckoutContext): CheckoutStepId {
  return isSplitFlow(context) ? 'splitSuccess' : 'confirmation';
}

function nextLegTarget(context: CheckoutContext): CheckoutStepId {
  if (isCustomSplitFlow(context)) {
    return 'itemSelection';
  }
  return isCustomAmountFlow(context) ? 'amountEntry' : 'methodSelection';
}

function methodSelectionConfirmTarget(context: CheckoutContext): CheckoutStepId {
  if (context.paymentLinkSelected) {
    return 'paymentLinkProcessing';
  }
  return requiresCashTenderedCapture(context) ? 'cashCapture' : 'processing';
}

function canConfirmFullCheckout(context: CheckoutContext): boolean {
  return context.paymentLinkSelected ? canConfirmPaymentLink(context, new Date()) : canConfirmCheckoutMethod(context);
}

export const checkoutSteps: CheckoutModalConfig['steps'] = {
  amountEntry: {
    actions: [
      {
        id: 'back',
        intent: 'changeFlow',
        kind: 'secondary',
        labelKey: 'common.back',
        placement: 'leading',
        visibleWhen: hasNotStartedPayment,
      },
      {
        id: 'cancel',
        intent: 'cancel',
        kind: 'secondary',
        labelKey: 'common.cancel',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasStartedWithoutRecordedPayments,
      },
      {
        id: 'cancelCheckout',
        intent: 'cancelCheckout',
        kind: 'secondary',
        labelKey: 'checkout.cancelAndRefund',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasRecordedPayments,
      },
      { enabledWhen: canConfirmCustomAmount, id: 'continue', intent: 'continue', kind: 'primary', labelKey: 'common.continue' },
    ],
    canEnter: isCustomAmountFlow,
    chrome: { disableClose: false, showBack: false, showClose: false, showProgress: true },
    id: 'amountEntry',
    prefetch: ['methodSelection', 'splitProgress', 'confirmCancel'],
    titleKey: 'checkout.title',
    transitions: [
      { on: 'changeFlow', target: 'flowSelection' },
      { on: 'cancelCheckout', target: 'confirmCancel' },
      { on: 'continue', target: 'methodSelection' },
      { on: 'viewHistory', target: 'splitProgress' },
    ],
    loader: () => import('../steps/amount-entry/amount-entry-step.component').then(m => m.AmountEntryStepComponent),
  },
  calculator: {
    actions: [
      {
        id: 'confirm',
        intent: 'back',
        kind: 'primary',
        labelKey: 'checkout.calculator.confirmOperation',
      },
    ],
    chrome: {
      centerTitle: true,
      compactLayout: true,
      disableClose: false,
      fullWidthPrimary: true,
      showBack: true,
      showClose: false,
      showProgress: false,
    },
    id: 'calculator',
    titleKey: 'checkout.calculator.title',
    transitions: [],
    loader: () => import('../steps/calculator/calculator-step.component').then(m => m.CalculatorStepComponent),
  },
  // cancelConfirmation is the dedicated Cancel Confirmation step (B2BO-7939): the session was
  // cancelled and refunded, and its only action closes the modal. The close uses the reserved
  // `cancel` intent (completed: false) so the purchase side never treats it as a completed
  // checkout — the cart and its reserved capacity stay untouched.
  cancelConfirmation: {
    actions: [{ id: 'close', intent: 'cancel', kind: 'primary', labelKey: 'common.close' }],
    canEnter: hasRecordedPayments,
    chrome: { disableClose: true, showBack: false, showClose: false, showProgress: false },
    id: 'cancelConfirmation',
    titleKey: 'checkout.title',
    transitions: [],
    loader: () => import('../steps/cancel-confirmation/cancel-confirmation-step.component').then(m => m.CancelConfirmationStepComponent),
  },
  // cancelFailed keeps the user inside the modal after a failed session cancel: no close, no
  // back, no way to bypass the failed cancellation — only the step's retry action, which
  // re-enters the cancelling step and re-requests the cancellation.
  cancelFailed: {
    actions: [],
    canEnter: hasRecordedPayments,
    chrome: { disableClose: true, showBack: false, showClose: false, showProgress: false },
    id: 'cancelFailed',
    prefetch: ['cancelling'],
    titleKey: 'checkout.title',
    transitions: [{ on: 'retryCancel', target: 'cancelling' }],
    loader: () => import('../steps/cancel-failed/cancel-failed-step.component').then(m => m.CancelFailedStepComponent),
  },
  // cancelling locks the modal while the whole-session /cancel call is in flight: no actions,
  // no close, no dismissal. The step component requests the cancellation through the payment
  // port and routes its outcome to cancelConfirmation or cancelFailed.
  cancelling: {
    actions: [],
    canEnter: hasRecordedPayments,
    chrome: { disableClose: true, showBack: false, showClose: false, showProgress: false },
    id: 'cancelling',
    prefetch: ['cancelConfirmation', 'cancelFailed'],
    titleKey: 'checkout.title',
    transitions: [
      { on: 'cancelSucceeded', target: 'cancelConfirmation' },
      { on: 'cancelFailed', target: 'cancelFailed' },
    ],
    loader: () => import('../steps/cancelling/cancelling-step.component').then(m => m.CancellingStepComponent),
  },
  // The header close gives up the sale while nothing was charged. Once a split has recorded a leg
  // it hides, and the cashier goes back to the payment methods to cancel and refund from there.
  cashCapture: {
    actions: [
      {
        id: 'back',
        intent: 'back',
        kind: 'secondary',
        labelKey: 'common.cancel',
        placement: 'leading',
        sentiment: 'danger',
      },
      { id: 'skip', intent: 'confirm', kind: 'primary', labelKey: 'common.skip', visibleWhen: canSkipCashCapture },
      {
        enabledWhen: canConfirmCashCapture,
        id: 'continue',
        intent: 'confirm',
        kind: 'primary',
        labelKey: 'common.continue',
        visibleWhen: canContinueCashCapture,
      },
    ],
    canEnter: requiresCashTenderedCapture,
    chrome: {
      centerTitle: true,
      compactLayout: true,
      disableClose: false,
      showBack: false,
      showClose: hasNoRecordedPayments,
      showProgress: false,
    },
    id: 'cashCapture',
    prefetch: ['processing', 'paymentFailed'],
    titleKey: 'checkout.cashCapture.calculateChangeTitle',
    transitions: [{ on: 'confirm', target: 'processing' }],
    loader: () => import('../steps/cash-capture/cash-capture-step.component').then(m => m.CashCaptureStepComponent),
  },
  // checkoutFailed is the pre-charge failure screen (B2BO-8855): the purchase failed before any
  // money was taken (a rejected coupon or gift card, a cart-preparation error, a checkout that never
  // opened), so a resend would only re-fail identically. It offers a return to the payment methods —
  // where the operator fixes the cart and continues — or a plain close, and never a resend. No
  // payment attempt is recorded for it. Distinct from `paymentFailed`, which keeps the resend for a
  // terminal decline once the payment was sent.
  checkoutFailed: {
    actions: [
      { id: 'close', intent: 'cancel', kind: 'secondary', labelKey: 'common.close', placement: 'leading' },
      { id: 'back', intent: 'changeMethod', kind: 'primary', labelKey: 'checkout.checkoutFailed.backToMethods' },
    ],
    chrome: { disableClose: false, showBack: false, showClose: false, showProgress: false },
    id: 'checkoutFailed',
    prefetch: ['methodSelection'],
    titleKey: 'checkout.title',
    transitions: [{ on: 'changeMethod', target: 'methodSelection' }],
    loader: () => import('../steps/checkout-failed/checkout-failed-step.component').then(m => m.CheckoutFailedStepComponent),
  },
  confirmation: {
    actions: [],
    chrome: { closeCompletes: true, disableClose: false, showBack: false, showClose: false, showProgress: false },
    id: 'confirmation',
    titleKey: 'checkout.title',
    transitions: [],
    loader: () => import('../steps/confirmation/confirmation-step.component').then(m => m.ConfirmationStepComponent),
  },
  confirmCancel: {
    actions: [
      { id: 'dismiss', intent: 'back', kind: 'secondary', labelKey: 'checkout.confirmCancel.dismiss', placement: 'leading' },
      { id: 'confirm', intent: 'confirm', kind: 'primary', labelKey: 'checkout.confirmCancel.confirm' },
    ],
    canEnter: hasRecordedPayments,
    chrome: { disableClose: true, showBack: false, showClose: false, showProgress: false },
    id: 'confirmCancel',
    prefetch: ['cancelling'],
    titleKey: 'checkout.title',
    transitions: [{ on: 'confirm', target: 'cancelling' }],
    loader: () => import('../steps/confirm-cancel/confirm-cancel-step.component').then(m => m.ConfirmCancelStepComponent),
  },
  flowSelection: {
    actions: [
      {
        id: 'cancel',
        intent: 'cancel',
        kind: 'secondary',
        labelKey: 'common.cancel',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasNoRecordedPayments,
      },
      {
        id: 'cancelCheckout',
        intent: 'cancelCheckout',
        kind: 'secondary',
        labelKey: 'checkout.cancelAndRefund',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasRecordedPayments,
      },
      { enabledWhen: hasSelectedFlow, id: 'continue', intent: 'continue', kind: 'primary', labelKey: 'common.continue' },
    ],
    chrome: { disableClose: false, showBack: false, showClose: false, showProgress: false },
    id: 'flowSelection',
    prefetch: ['methodSelection', 'splitConfig', 'itemSelection', 'amountEntry', 'confirmCancel'],
    titleKey: 'checkout.title',
    transitions: [
      { on: 'cancelCheckout', target: 'confirmCancel' },
      { on: 'continue', target: flowSelectionTarget },
    ],
    loader: () => import('../steps/flow-selection/flow-selection-step.component').then(m => m.FlowSelectionStepComponent),
  },
  itemSelection: {
    actions: [
      {
        id: 'back',
        intent: 'changeFlow',
        kind: 'secondary',
        labelKey: 'common.back',
        placement: 'leading',
        visibleWhen: hasNotStartedPayment,
      },
      {
        id: 'cancel',
        intent: 'cancel',
        kind: 'secondary',
        labelKey: 'common.cancel',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasStartedWithoutRecordedPayments,
      },
      {
        id: 'cancelCheckout',
        intent: 'cancelCheckout',
        kind: 'secondary',
        labelKey: 'checkout.cancelAndRefund',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasRecordedPayments,
      },
      { enabledWhen: canConfirmCustomAmount, id: 'continue', intent: 'continue', kind: 'primary', labelKey: 'common.continue' },
    ],
    canEnter: canEnterItemSelection,
    chrome: { disableClose: false, showBack: false, showClose: false, showProgress: true },
    id: 'itemSelection',
    prefetch: ['methodSelection', 'splitProgress', 'confirmCancel'],
    titleKey: 'checkout.title',
    transitions: [
      { on: 'changeFlow', target: 'flowSelection' },
      { on: 'cancelCheckout', target: 'confirmCancel' },
      { on: 'continue', target: 'methodSelection' },
      { on: 'viewHistory', target: 'splitProgress' },
    ],
    loader: () => import('../steps/item-selection/item-selection-step.component').then(m => m.ItemSelectionStepComponent),
  },
  methodSelection: {
    actions: [
      {
        id: 'cancel',
        intent: 'cancel',
        kind: 'secondary',
        labelKey: 'common.cancel',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasNoRecordedPayments,
      },
      {
        id: 'cancelCheckout',
        intent: 'cancelCheckout',
        kind: 'secondary',
        labelKey: 'checkout.cancelAndRefund',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasRecordedPayments,
      },
      { enabledWhen: canGoBackToConfig, id: 'back', intent: 'back', kind: 'secondary', labelKey: 'common.back' },
      {
        enabledWhen: canConfirmFullCheckout,
        id: 'confirm',
        intent: 'confirm',
        kind: 'primary',
        labelKey: 'checkout.split.confirmPayment',
        visibleWhen: isFullFlow,
      },
      {
        enabledWhen: canConfirmSplitPayment,
        id: 'confirmSplit',
        intent: 'confirm',
        kind: 'primary',
        labelKey: 'checkout.split.confirmPayment',
        visibleWhen: isSplitFlow,
      },
    ],
    chrome: { disableClose: false, showBack: false, showClose: false, showFooterSeparator: isSplitFlow, showProgress: isSplitFlow },
    id: 'methodSelection',
    prefetch: [
      'processing',
      'confirmation',
      'splitSuccess',
      'splitProgress',
      'calculator',
      'cashCapture',
      'confirmCancel',
      'paymentLinkProcessing',
    ],
    titleKey: 'checkout.title',
    transitions: [
      { on: 'cancelCheckout', target: 'confirmCancel' },
      { on: 'confirm', target: methodSelectionConfirmTarget },
      { on: 'openCalculator', target: 'calculator' },
      { on: 'viewHistory', target: 'splitProgress' },
    ],
    loader: () => import('../steps/method-selection/method-selection-step.component').then(m => m.MethodSelectionStepComponent),
  },
  // paymentFailed lets the cashier resend the failed pay-in-full payment (same method, via the
  // step's retry button) or go back to method selection. The failure reason is surfaced under the
  // title by the step component.
  paymentFailed: {
    actions: [
      {
        id: 'cancel',
        intent: 'cancel',
        kind: 'secondary',
        labelKey: 'common.cancel',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasNoRecordedPayments,
      },
      {
        id: 'cancelCheckout',
        intent: 'cancelCheckout',
        kind: 'secondary',
        labelKey: 'checkout.cancelAndRefund',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasRecordedPayments,
      },
      { id: 'back', intent: 'changeMethod', kind: 'secondary', labelKey: 'common.back', visibleWhen: canChangeMethodAfterFailure },
    ],
    chrome: { disableClose: false, showBack: false, showClose: false, showProgress: isSplitFlow },
    id: 'paymentFailed',
    prefetch: ['processing', 'methodSelection', 'confirmCancel'],
    titleKey: 'checkout.title',
    transitions: [
      { on: 'retry', target: 'processing' },
      { on: 'cancelCheckout', target: 'confirmCancel' },
      { on: 'changeMethod', target: 'methodSelection' },
    ],
    loader: () => import('../steps/payment-failed/payment-failed-step.component').then(m => m.PaymentFailedStepComponent),
  },
  processing: {
    actions: [
      {
        enabledWhen: never,
        id: 'back',
        intent: 'back',
        kind: 'secondary',
        labelKey: 'common.back',
        placement: 'leading',
        visibleWhen: isSplitFlow,
      },
      {
        enabledWhen: never,
        id: 'confirmSplit',
        intent: 'confirm',
        kind: 'primary',
        labelKey: 'checkout.split.confirmPayment',
        visibleWhen: isSplitFlow,
      },
    ],
    chrome: { disableClose: true, showBack: false, showClose: false, showProgress: isSplitFlow },
    id: 'processing',
    prefetch: ['confirmation', 'splitSuccess', 'paymentFailed', 'cashCapture', 'splitProgress'],
    titleKey: 'checkout.title',
    transitions: [
      { on: 'paid', target: paidTarget },
      { on: 'cancelSplit', target: nextLegTarget },
      { on: 'paymentFailed', target: 'paymentFailed' },
      { on: 'checkoutFailed', target: 'checkoutFailed' },
      { on: 'viewHistory', target: 'splitProgress' },
    ],
    loader: () => import('../steps/processing/processing-step.component').then(m => m.ProcessingStepComponent),
  },
  paymentLinkProcessing: {
    actions: [],
    chrome: { disableClose: true, showBack: false, showClose: false, showProgress: false },
    id: 'paymentLinkProcessing',
    titleKey: 'checkout.title',
    transitions: [{ on: 'paymentLinkFailed', target: 'methodSelection' }],
    loader: () =>
      import('../steps/payment-link-processing/payment-link-processing-step.component').then(m => m.PaymentLinkProcessingStepComponent),
  },
  splitConfig: {
    // Footer layout mirrors methodSelection (B2BO-8103): a danger `cancel` sits far left (it opts
    // into the `leading` placement, so the shell pins it to the start) while `back` and `continue`
    // cluster on the right. Cancel is offered here on the "indicate nº split"
    // step before any payment starts, using the reserved `cancel` intent that just closes the modal
    // (no backend call), and is swapped for `cancelCheckout` once money has been recorded.
    actions: [
      {
        id: 'cancel',
        intent: 'cancel',
        kind: 'secondary',
        labelKey: 'common.cancel',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: isSplitFlowWithoutRecordedPayments,
      },
      {
        id: 'cancelCheckout',
        intent: 'cancelCheckout',
        kind: 'secondary',
        labelKey: 'checkout.cancelAndRefund',
        placement: 'leading',
        sentiment: 'danger',
        visibleWhen: hasRecordedPayments,
      },
      { id: 'back', intent: 'changeFlow', kind: 'secondary', labelKey: 'common.back', visibleWhen: hasNotStartedPayment },
      { enabledWhen: isSplitConfigValid, id: 'continue', intent: 'continue', kind: 'primary', labelKey: 'common.continue' },
    ],
    canEnter: canEnterSplitConfig,
    chrome: { disableClose: false, showBack: false, showClose: false, showProgress: true },
    id: 'splitConfig',
    prefetch: ['methodSelection', 'splitProgress', 'confirmCancel'],
    titleKey: 'checkout.title',
    transitions: [
      { on: 'changeFlow', target: 'flowSelection' },
      { on: 'cancelCheckout', target: 'confirmCancel' },
      { on: 'continue', target: 'methodSelection' },
      { on: 'viewHistory', target: 'splitProgress' },
    ],
    loader: () => import('../steps/split-config/split-config-step.component').then(m => m.SplitConfigStepComponent),
  },
  // splitProgress is an on-demand, read-only transaction history opened from the "Paid" amount in the split summary panel.
  splitProgress: {
    actions: [
      {
        fullWidth: true,
        id: 'back',
        intent: 'back',
        kind: 'primary',
        labelKey: 'checkout.splitProgress.backToPayment',
        visibleWhen: hasNoPendingReturn,
      },
      {
        fullWidth: true,
        id: 'resume',
        intent: 'resumeCheckout',
        kind: 'primary',
        labelKey: 'checkout.splitProgress.backToPayment',
        visibleWhen: hasPendingReturn,
      },
    ],
    canEnter: isSplitFlow,
    chrome: { disableClose: false, showBack: false, showClose: false, showProgress: false },
    id: 'splitProgress',
    prefetch: ['methodSelection', 'itemSelection', 'amountEntry', 'paymentFailed', 'splitSuccess'],
    titleKey: 'checkout.splitProgress.title',
    transitions: [
      { guard: isCartFullyPaid, on: 'paid', target: 'splitSuccess' },
      { on: 'resumeCheckout', target: resumeCheckoutTarget },
    ],
    loader: () => import('../steps/split-progress/split-progress-step.component').then(m => m.SplitProgressStepComponent),
  },
  splitSuccess: {
    actions: [
      { enabledWhen: never, id: 'back', intent: 'back', kind: 'secondary', labelKey: 'common.back', placement: 'leading' },
      { enabledWhen: never, id: 'confirmSplit', intent: 'confirm', kind: 'primary', labelKey: 'checkout.split.confirmPayment' },
    ],
    canEnter: isSplitFlow,
    chrome: { disableClose: true, showBack: false, showClose: false, showProgress: true },
    id: 'splitSuccess',
    prefetch: ['methodSelection', 'itemSelection', 'amountEntry'],
    titleKey: 'checkout.title',
    transitions: [{ on: 'next', target: nextLegTarget }],
    loader: () => import('../steps/split-success/split-success-step.component').then(m => m.SplitSuccessStepComponent),
  },
};
