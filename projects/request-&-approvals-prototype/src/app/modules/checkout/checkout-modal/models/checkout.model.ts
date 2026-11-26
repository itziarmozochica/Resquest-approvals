import type { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import type { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import type { Money } from '@fz-original/app/shared/models/money.model';

import type { CheckoutCartItem } from './checkout-cart-item.model';
import type { CheckoutPaymentLinkOption } from './checkout-payment-link.model';
import type { CheckoutTransactionRecord } from './transaction-history.model';

export type CheckoutStepId =
  | 'flowSelection'
  | 'splitConfig'
  | 'itemSelection'
  | 'amountEntry'
  | 'methodSelection'
  | 'calculator'
  | 'cashCapture'
  | 'processing'
  | 'paymentLinkProcessing'
  | 'paymentFailed'
  | 'checkoutFailed'
  | 'splitProgress'
  | 'splitSuccess'
  | 'cancelling'
  | 'cancelFailed'
  | 'cancelConfirmation'
  | 'confirmCancel'
  | 'confirmation';

export type CheckoutFlowType = 'full' | 'splitEqually' | 'customSplit' | 'customAmount';

export const DEFAULT_CHECKOUT_FLOW_TYPES: CheckoutFlowType[] = ['full', 'splitEqually', 'customSplit', 'customAmount'];

export type CheckoutFlowKind = 'fullCheckout' | 'fullPaymentIntegrated' | 'fullPaymentCash';

/**
 * How the cash-tendered step treats the amount received. `mandatory` blocks the leg until the
 * amount covers what is due and reports it for fiscal signing; `optional` is a plain change
 * calculator the cashier may skip. Resolved by the opener, which owns the fiscal rules.
 */
export type CheckoutCashCaptureMode = 'mandatory' | 'optional';

export type CheckoutIntent =
  | 'back'
  | 'cancel'
  | 'cancelCheckout'
  | 'cancelFailed'
  | 'cancelSplit'
  | 'cancelSucceeded'
  | 'changeFlow'
  | 'changeMethod'
  | 'checkoutFailed'
  | 'close'
  | 'confirm'
  | 'continue'
  | 'finish'
  | 'next'
  | 'openCalculator'
  | 'paid'
  | 'paymentFailed'
  | 'paymentLinkFailed'
  | 'resumeCheckout'
  | 'retry'
  | 'retryCancel'
  | 'viewHistory';

export interface CheckoutContext {
  activePaymentResend?: boolean;
  availableMethods: CheckoutPaymentMethodDescriptor[];
  availableTerminals: CheckoutTerminalOption[];
  availableFlowTypes: CheckoutFlowType[];
  /** Failure reason of the last whole-session cancel attempt, surfaced on the cancel-failed step. */
  cancelFailureReason: string | null;
  calculatorReceivedAmount: number | null;
  cartItems: CheckoutCartItem[];
  cartTotal: Money | null;
  cashCaptureMode: CheckoutCashCaptureMode;
  currentSplitIndex: number;
  flowType: CheckoutFlowType | null;
  legInFlight: boolean;
  locale: string;
  paidAmount: Money | null;
  paidItemIds: string[];
  paymentFailureReason: string | null;
  /** Offered only when the opener passes {@link CheckoutModalData.paymentLink}, and only for pay-in-full. */
  paymentLink: CheckoutPaymentLinkOption | null;
  /** Duration as typed by the user (`hh:mm`). */
  paymentLinkDuration: string;
  /** Translation key of the opener's last refusal, shown under the duration. */
  paymentLinkErrorKey: string | null;
  paymentLinkSelected: boolean;
  paymentResendBlocked?: boolean;
  paymentStarted: boolean;
  payRemaining: boolean;
  pendingReturnStepId: CheckoutStepId | null;
  /**
   * True when the next processing entry must resend the previously failed attempt (same method,
   * against the same parent checkout) instead of starting a fresh purchase. Set by the
   * payment-failed retry action and cleared as soon as a method is (re)selected, so a method change
   * always runs the full purchase pipeline.
   */
  resendRequested: boolean;
  selectedItemIds: string[];
  selectedMethod: PaymentType | null;
  /**
   * Payment path of the selected method. The same `type` may be offered twice (integrated and
   * delegated), so the selection is the `(selectedMethod, selectedMethodDelegated)` pair; `null`
   * only while nothing is selected.
   */
  selectedMethodDelegated: boolean | null;
  selectedTerminalId: string | null;
  /**
   * Amount actually captured on the backend session, as reported by the payment driver with a
   * failure that happened after the money was collected (booking failure on a fully paid session).
   * It can exceed `paidAmount`, whose leg accounting lags on the final leg (never reported as an
   * intermediate success); the cancel-checkout gate reads both so the in-modal cancellation is
   * offered whenever money has actually been captured (B2BO-7939).
   */
  sessionPaidAmount: Money | null;
  splitAmountOverride: Money | null;
  splitCount: number;
  tapToPayCancelRequested: boolean;
  tapToPay?: boolean;
  /** Completed legs of the current checkout (amount + method), recorded by every split flow. */
  transactions: CheckoutTransactionRecord[];
  legStartedAt?: number;
}

export interface CheckoutPaymentMethodDescriptor {
  /**
   * Payment path of the method: delegated methods are managed externally (cash, checks, delegated
   * card variants, any configured code) and never require a terminal; non-delegated ones are
   * managed through an integrated gateway (e.g. Adyen card).
   *
   * The same `type` may appear twice in `availableMethods` — once integrated and once delegated
   * (a configuration can offer an adyen `card` plus a delegated `card`) — so a method option is
   * identified by the `(type, delegated)` pair, never by `type` alone.
   */
  delegated: boolean;
  label: string;
  type: PaymentType;
  imageUrl?: string | null;
  /**
   * Disambiguation suffix rendered in parentheses after the label when the same `type` exists on
   * both payment paths: the gateway provider name for the integrated entry ("Card (Adyen)"),
   * `checkout.method.external` for the delegated one ("Card (External)"). Rendered through the
   * translate pipe — literal provider names pass through unchanged.
   */
  labelSuffixKey?: string | null;
}

export type CheckoutPreselectedMethod = Pick<CheckoutPaymentMethodDescriptor, 'delegated' | 'type'>;

export interface CheckoutTerminalOption {
  id: string;
  label: string | null;
}

export interface CheckoutModalData {
  availableMethods: CheckoutPaymentMethodDescriptor[];
  availableTerminals: CheckoutTerminalOption[];
  /**
   * Source-aware payment configuration for the selected onsite setup, used as the base when
   * persisting the terminal chosen in the modal (no stored configuration yet).
   */
  basePaymentConfiguration: PaymentConfiguration;
  cartTotal: Money;
  locale: string;
  selectedTerminalId: string | null;
  cartItems?: CheckoutCartItem[];
  cashCaptureMode?: CheckoutCashCaptureMode;
  tapToPay?: boolean;
  /** Flows the payment configuration offers, in display order; today's four when absent. */
  checkoutFlows?: CheckoutFlowType[];
  /** Narrows the modal to the flow tiles of the flow selection step when there are fewer than four. */
  fitToTiles?: boolean;
  flow?: CheckoutFlowKind;
  paymentLink?: CheckoutPaymentLinkOption | null;
  preselectedMethod?: CheckoutPreselectedMethod;
}
