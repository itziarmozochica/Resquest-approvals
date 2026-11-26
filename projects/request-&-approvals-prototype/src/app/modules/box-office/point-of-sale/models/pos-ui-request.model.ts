import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import {
  ContactInformationOrderableFieldEnum,
  type HardwareTypeEnum,
} from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { type PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { type CheckoutCartItem } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-cart-item.model';
import type { CheckoutPaymentLinkOption } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-link.model';
import {
  type CheckoutCashCaptureMode,
  type CheckoutFlowKind,
  type CheckoutFlowType,
  type CheckoutPaymentMethodDescriptor,
  type CheckoutPreselectedMethod,
  type CheckoutTerminalOption,
} from '@fz-original/app/modules/checkout/checkout-modal/models/checkout.model';
import { type ContactInformationUserDetails } from '@fz-original/app/shared/components/contact-information-modal/contact-information-modal.component';
import { type BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Customer } from '@fz-original/app/shared/models/customer/customer.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { type FiscalComplianceBlockCode } from '@fz-original/app/shared/services/fiscal-compliance-block/fiscal-compliance-block-code';
import { type TrackingEvent } from '@fz/fz-tracking/src/public-api';
import { type Observable } from 'rxjs';

import { type PosHardwareCheckResolution } from './pos-hardware-check.model';

/**
 * Context handed to the component when the purchase pipeline needs contact details.
 * Mirrors `ContactInformationModalData` so the component's handler is a straight pass-through into
 * `IgntDialogService.openModal`.
 */
export interface PosContactInfoContext {
  /** The server cart being created; absent when the cart already exists. */
  cartReady$?: Observable<unknown>;
  defaultCountry: string | null;
  fieldsOrder: ContactInformationOrderableFieldEnum[] | null;
  isDualScreenSynchronizationActive: boolean;
  keepsDraft: boolean;
  mandatoryFields: string[];
  previousUserDetails: ContactInformationUserDetails;
  showEmail: boolean;
  showPhoneNumber: boolean;
}

/** `null` when the modal was dismissed or returned a non-`USER` customer — pipeline aborts. */
export type PosContactInfoResult = Customer | null;

/**
 * `BookingQuestionsModalService`'s pre- and post-booking calls — same modal service, two phases, so
 * they share one request kind.
 */
export interface PosBookingQuestionsContext {
  cart: Cart | null;
  phase: 'pre' | 'post';
  customer?: Customer;
  /** Only set for `phase: 'post'`; the order the questions are attached to. */
  orderId?: number;
}

/** `false` means the user backed out of the questions — pipeline aborts. */
export type PosBookingQuestionsResult = boolean;

/** Mirrors `OpenCheckoutModalParams`. */
export interface PosCheckoutContext {
  availableMethods: CheckoutPaymentMethodDescriptor[];
  availableTerminals: CheckoutTerminalOption[];
  basePaymentConfiguration: PaymentConfiguration;
  cartTotal: Money;
  locale: string;
  selectedTerminalId: string | null;
  cartItems?: CheckoutCartItem[];
  cashCaptureMode?: CheckoutCashCaptureMode;
  checkoutFlows?: CheckoutFlowType[];
  fitToTiles?: boolean;
  flow?: CheckoutFlowKind;
  preselectedMethod?: CheckoutPreselectedMethod;
  paymentLink?: CheckoutPaymentLinkOption | null;
  tapToPay?: boolean;
}

/** The payment method the operator confirmed in the checkout modal. */
export type PosCheckoutResult = PaymentType;

/** Inputs of `CashChangeCalculatorModalComponent`. */
export interface PosCashCalculatorContext {
  cart: Cart;
  cashModalMandatory: boolean;
  trackViewEvent?: TrackingEvent;
}

/** `null` when dismissed; `#validateCashCalculator` then aborts a CASH payment. */
export type PosCashCalculatorResult = { amount: number } | null;

/**
 * Builds the whole `ConfirmModalConfig` from a translation prefix
 * (`<prefix>.title|message|leftButton|rightButton`), which is what keeps the strategy free of
 * `TranslateService`. Also covers the override-capacity confirmation, which reuses the same modal
 * with a different prefix.
 */
export interface PosConfirmTranslationPrefixContext {
  translationPrefix: string;
  variant?: 'translationPrefix';
}

/**
 * `OssModifyOrderValidationModalComponent`, with already-translated strings: the strategy owns the
 * translation and datetime interpolation before opening. Parity-locked: `mode: 'info'` is terminal,
 * so the strategy still requests it and ignores the answer.
 */
export interface PosConfirmModifyOrderValidationContext {
  message: string;
  /** `'confirm'` for the legacy `warning` payload, `'info'` for `error`. */
  mode: 'confirm' | 'info';
  title: string;
  variant: 'modifyOrderValidation';
  alertTitle?: string;
}

/**
 * `OssTimeslotWarningModalComponent`. Field names mirror
 * `OssTimeslotWarningModalData` so the handler is a pass-through.
 *
 * Component: `Dialog.open<boolean, OssTimeslotWarningModalData>(…, { data: { newlySelectedDatetime,
 * title }, disableClose: true })`; respond `result === true`.
 */
export interface PosConfirmTimeslotMismatchContext {
  newlySelectedDatetime: string;
  title: string;
  variant: 'timeslotMismatch';
}

/**
 * Every blocking yes/no step. Discriminated on the optional `variant` so the component can narrow
 * exhaustively while the prefix form (the majority) stays a bare `{ translationPrefix }`.
 */
export type PosConfirmContext =
  | PosConfirmTranslationPrefixContext
  | PosConfirmModifyOrderValidationContext
  | PosConfirmTimeslotMismatchContext;

/** `true` = right/accept button, `false` = dismissed or rejected. */
export type PosConfirmResult = boolean;

/**
 * Mirrors the `ErrorModalOptions` subset built by `showModal(title, message, errorCode)`. `error`
 * and `logError` are optional because some call sites hand the caught API envelope straight to
 * `ErrorModalService.open(error)`. Parity-locked: omitting `logError` suppresses the modal's own
 * Mixpanel event.
 */
export interface PosErrorContext {
  message: string;
  title: string;
  error?: BaseErrorResponse | BaseErrorResponse[];
  errorCode?: string | number;
  logError?: boolean;
  windowClass?: string;
}

/** The error modal is terminal — it acknowledges only that the component displayed it. */
export type PosErrorResult = void;

/**
 * A fiscal compliance rejection (`PLAN_VENUE_FISCAL_COUNTRY_MISMATCH`, `FISCAL_CONFIGURATION_REQUIRED`).
 * The business layer already detected the code, so the component only picks the modal copy for it.
 */
export interface PosFiscalComplianceBlockContext {
  code: FiscalComplianceBlockCode;
}

/** The compliance modal is terminal — it acknowledges only that the component displayed it. */
export type PosFiscalComplianceBlockResult = void;

/** `email` is optional because a membership may carry none. */
export interface PosMembershipsAcceptTermsContext {
  fullName: string;
  email?: string;
}

/** Emits only when the member accepted. Closing with ✕ completes empty, which abandons the purchase. */
export type PosMembershipsAcceptTermsResult = true;

/**
 * The active onsite setup contradicts the device. `overrideDeadline` is already formatted for the
 * operator: set, the modal is the warning and offers "Continue anyway"; `null`, it is the block.
 */
export interface PosHardwareMismatchContext {
  overrideDeadline: string | null;
  setupHardwareType: HardwareTypeEnum;
}

/** Closing the modal with ✕ or Escape answers `cancelled`. */
export type PosHardwareMismatchResult = PosHardwareCheckResolution;

/** Context payload per request kind. */
export interface PosUiRequestContextMap {
  bookingQuestions: PosBookingQuestionsContext;
  cashCalculator: PosCashCalculatorContext;
  checkout: PosCheckoutContext;
  confirm: PosConfirmContext;
  contactInfo: PosContactInfoContext;
  error: PosErrorContext;
  fiscalComplianceBlock: PosFiscalComplianceBlockContext;
  hardwareMismatch: PosHardwareMismatchContext;
  membershipsAcceptTerms: PosMembershipsAcceptTermsContext;
}

/** Result payload per request kind. */
export interface PosUiRequestResultMap {
  bookingQuestions: PosBookingQuestionsResult;
  cashCalculator: PosCashCalculatorResult;
  checkout: PosCheckoutResult;
  confirm: PosConfirmResult;
  contactInfo: PosContactInfoResult;
  error: PosErrorResult;
  fiscalComplianceBlock: PosFiscalComplianceBlockResult;
  hardwareMismatch: PosHardwareMismatchResult;
  membershipsAcceptTerms: PosMembershipsAcceptTermsResult;
}

export type PosUiRequestKind = keyof PosUiRequestContextMap;

/**
 * A UI step the business layer needs the component to perform. Discriminated on `kind` so the
 * component's single `requests$` subscription can switch exhaustively.
 *
 * `id` correlates the response; the strategy never sees it (`PosUiPortService.request()` handles the
 * correlation) and the component echoes the whole request back through `respond()`.
 */
export type PosUiRequest<Kind extends PosUiRequestKind = PosUiRequestKind> = {
  [K in Kind]: {
    readonly context: PosUiRequestContextMap[K];
    readonly id: number;
    readonly kind: K;
  };
}[Kind];

/** The component's answer to a {@link PosUiRequest}. */
export interface PosUiResponse<Kind extends PosUiRequestKind = PosUiRequestKind> {
  readonly id: number;
  readonly kind: Kind;
  readonly result: PosUiRequestResultMap[Kind];
}
