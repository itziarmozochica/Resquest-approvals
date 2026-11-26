import type { CheckoutContext, CheckoutFlowType, CheckoutStepId } from '../../models/checkout.model';
import { countCompletedCheckoutTransactions } from '../../utils/checkout-transaction-history.util';

export type CheckoutModalCloseOutcome = 'completed' | 'abandoned' | 'payment_link_sent' | 'session_cancelled';

export interface CheckoutModalTrackingSnapshot {
  cancelFailureReason: string | null;
  cartTotal: number;
  currency: string;
  currentSplitIndex: number;
  flowType: CheckoutFlowType | null;
  hadRecordedPayments: boolean;
  history: CheckoutStepId[];
  itemCount: number;
  legAmount: number | null;
  legsCompleted: number;
  paidAmount: number;
  paymentFailureReason: string | null;
  paymentStarted: boolean;
  payRemaining: boolean;
  remainingAmount: number;
  resendRequested: boolean;
  selectedItemCount: number;
  selectedMethod: string | null;
  sessionPaidAmount: number;
  splitCount: number;
  transactionsCount: number;
  availableMethods: string[];
}

export function moneyAmount(value: { amount: number } | null | undefined): number {
  return value?.amount ?? 0;
}

export function buildCheckoutModalTrackingSnapshot(params: {
  context: CheckoutContext;
  currentSplitAmount: number | null;
  history: CheckoutStepId[];
  remainingAmount: number;
}): CheckoutModalTrackingSnapshot {
  const { context, currentSplitAmount, history, remainingAmount } = params;
  const paidAmount = moneyAmount(context.paidAmount);
  const sessionPaidAmount = moneyAmount(context.sessionPaidAmount);
  const legsCompleted = countCompletedCheckoutTransactions(context.transactions);
  const hadRecordedPayments = legsCompleted > 0 || sessionPaidAmount > 0 || paidAmount > 0;

  return {
    availableMethods: context.availableMethods.map(descriptor => String(descriptor.type)),
    cancelFailureReason: context.cancelFailureReason,
    cartTotal: moneyAmount(context.cartTotal),
    currency: context.cartTotal?.currency ?? 'EUR',
    currentSplitIndex: context.currentSplitIndex,
    flowType: context.flowType,
    hadRecordedPayments,
    history: [...history],
    itemCount: context.cartItems.length,
    legAmount: currentSplitAmount,
    legsCompleted,
    paidAmount,
    paymentFailureReason: context.paymentFailureReason,
    paymentStarted: context.paymentStarted,
    payRemaining: context.payRemaining,
    remainingAmount,
    resendRequested: context.resendRequested,
    selectedItemCount: context.selectedItemIds.length,
    selectedMethod: context.selectedMethod === null ? null : String(context.selectedMethod),
    sessionPaidAmount,
    splitCount: context.splitCount,
    transactionsCount: legsCompleted,
  };
}

export function resolveCheckoutModalCloseOutcome(params: {
  completed: boolean;
  lastStepId: CheckoutStepId | null;
  paymentLinkSent: boolean;
  sessionCancelSucceeded: boolean;
}): CheckoutModalCloseOutcome {
  if (params.completed) {
    return 'completed';
  }
  if (params.paymentLinkSent) {
    return 'payment_link_sent';
  }
  if (params.sessionCancelSucceeded || params.lastStepId === 'cancelConfirmation') {
    return 'session_cancelled';
  }
  return 'abandoned';
}

export function buildCheckoutModalPath(stepIds: Array<CheckoutStepId | null>): string {
  return stepIds.filter((stepId): stepId is CheckoutStepId => stepId !== null).join('>');
}
