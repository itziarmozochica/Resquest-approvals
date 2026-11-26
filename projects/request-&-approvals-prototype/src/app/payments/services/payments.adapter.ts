import { HttpErrorResponse } from '@angular/common/http';

import { TimeoutError } from 'rxjs';

import type {
  CancelPaymentResponseDto,
  ConfirmPaymentResponseDto,
  CreateCartPaymentRequestDto,
  CreateCartPaymentResponseDto,
  PaymentSplitDto,
  PaymentsStatusDto,
  TapToPaySessionResponseDto,
  TriggerPaymentRequestDto,
  TriggerPaymentResponseDto,
} from '../models/payments.dto';
import type {
  CancelPaymentResponse,
  CartPaymentCheckout,
  CartPaymentSession,
  ConfirmPaymentResponse,
  CreateCartPaymentParams,
  CreateCartPaymentResponse,
  PaymentFailureCategory,
  PaymentSplit,
  PaymentsStatus,
  SplitChargeStatus,
  SplitSessionStatus,
  TriggerPaymentParams,
  TriggerPaymentResponse,
} from '../models/payments.model';
import { isPaymentFailureCategory, isSplitChargeStatus, isSplitSessionStatus } from '../models/payments.model';
import type { TapToPaySession } from '../models/tap-to-pay.model';
import {
  TAP_TO_PAY_SESSION_ERROR_BACKEND_TIMEOUT,
  TAP_TO_PAY_SESSION_ERROR_BACKEND_UNREACHABLE,
  TAP_TO_PAY_SESSION_ERROR_INVALID_RESPONSE,
  TAP_TO_PAY_SESSION_ERROR_UNEXPECTED,
  TapToPaySessionError,
} from '../models/tap-to-pay.model';

/**
 * Charge statuses that mean the leg itself has ended and is no longer settling: a `failed` leg or a
 * `canceled` one (single-L, the backend charge spelling). Combined with a non-null `failure_category`
 * they decide whether the latest split has failed for good.
 */
const TERMINAL_FAILURE_STATUSES: readonly SplitChargeStatus[] = ['failed', 'canceled'];

function isTerminalFailureSplit(split: PaymentSplit): boolean {
  return TERMINAL_FAILURE_STATUSES.includes(split.status) || split.failureCategory !== null;
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

/**
 * An unrecognised wire status is treated as still settling: consumers keep polling (bounded by
 * their own timeout), which is safer than misclassifying a future backend status as paid or failed.
 */
function toSplitChargeStatus(value: string): SplitChargeStatus {
  return isSplitChargeStatus(value) ? value : 'in_progress';
}

function toSplitSessionStatus(value: string): SplitSessionStatus {
  return isSplitSessionStatus(value) ? value : 'in_progress';
}

/** The backend degrades unknown gateway reasons to `UNKNOWN`; mirror that for unknown wire values. */
function toPaymentFailureCategory(value: string | null): PaymentFailureCategory | null {
  if (value === null) {
    return null;
  }
  return isPaymentFailureCategory(value) ? value : 'UNKNOWN';
}

function fromSplitDto(dto: PaymentSplitDto): PaymentSplit {
  return {
    amount: toNumber(dto.amount),
    createdAt: dto.created_at,
    deviceId: dto.device_id,
    failureCategory: toPaymentFailureCategory(dto.failure_category),
    gateway: dto.gateway,
    id: dto.id,
    paymentMethod: dto.payment_method,
    pspReference: dto.psp_reference,
    status: toSplitChargeStatus(dto.status),
    timestamp: dto.timestamp,
  };
}

/**
 * Trigger-time backend `error_code`s that name a known failure category under a different word.
 * A code that is already a {@link PaymentFailureCategory} maps to itself without an entry here.
 */
const TRIGGER_ERROR_CODE_FAILURE_CATEGORIES: Readonly<Record<string, PaymentFailureCategory>> = {
  TERMINAL_UNREACHABLE: 'TERMINAL_UNAVAILABLE',
};

/** Unlike a split's `failure_category`, an unknown trigger code is not a category at all: `undefined`, not `UNKNOWN`. */
function toTriggerFailureCategory(errorCode: string | undefined): PaymentFailureCategory | undefined {
  if (errorCode === undefined) {
    return undefined;
  }
  if (isPaymentFailureCategory(errorCode)) {
    return errorCode;
  }
  return TRIGGER_ERROR_CODE_FAILURE_CATEGORIES[errorCode];
}

export function fromTriggerResponseDto(dto: TriggerPaymentResponseDto): TriggerPaymentResponse {
  return {
    chargeId: dto.charge_id ?? undefined,
    error: dto.error,
    failureCategory: toTriggerFailureCategory(dto.error_code),
    success: dto.success,
  };
}

/**
 * Classifies a rejected trigger call from its HTTP error body. The backend answers a trigger it
 * cannot deliver (e.g. an offline terminal) with a non-2xx status and the flat trigger shape
 * `{ success: false, error, error_code }`, which the platform-envelope normaliser does not read, so
 * the code has to be picked up here or it is lost.
 */
export function getTriggerErrorFailureCategory(error: unknown): PaymentFailureCategory | undefined {
  return toTriggerFailureCategory(getTriggerErrorCode(error));
}

export function getTriggerErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object') {
    return undefined;
  }
  const errorCode: unknown = (error as { error?: { error_code?: unknown } | null }).error?.error_code;
  return typeof errorCode === 'string' ? errorCode : undefined;
}

export function getCheckoutErrorCode(error: unknown): number | undefined {
  const response = error as {
    error?: { code?: unknown; error?: { code?: unknown } | null; status_code?: unknown } | null;
    status_code?: unknown;
  } | null;
  const code = Number(response?.status_code ?? response?.error?.status_code ?? response?.error?.code ?? response?.error?.error?.code);
  return Number.isFinite(code) ? code : undefined;
}

export function toTriggerPaymentRequestDto({
  amount,
  cashLegAmount,
  cashReceived,
  deviceId,
  gateway,
  method,
  paymentConfigurationId,
  splitLegIndex,
}: TriggerPaymentParams): TriggerPaymentRequestDto {
  return {
    ...(amount != null && { amount }),
    // Untranslated on purpose: partners turns adyen_local into fever2's adyen plus integration mode.
    ...(gateway != null && { gateway }),
    ...(method != null && { method }),
    ...(deviceId != null && { device_id: deviceId }),
    ...(paymentConfigurationId != null && { payment_configuration_id: paymentConfigurationId }),
    ...(cashReceived !== undefined && Number.isFinite(cashReceived) && cashReceived > 0 && { cash_received: cashReceived }),
    ...(cashLegAmount !== undefined && Number.isFinite(cashLegAmount) && cashLegAmount > 0 && { cash_leg_amount: cashLegAmount }),
    ...(splitLegIndex !== undefined && Number.isInteger(splitLegIndex) && splitLegIndex >= 0 && { split_leg_index: splitLegIndex }),
  };
}

function toCartPaymentCheckoutDto(checkout: CartPaymentCheckout): CreateCartPaymentRequestDto {
  return {
    user_id: checkout.userId,
    ...(checkout.channelId != null && { channel_id: checkout.channelId }),
    ...(checkout.placeId != null && { place_id: checkout.placeId }),
    ...(checkout.paymentMethodType != null && { payment_method_type: checkout.paymentMethodType }),
    ...(checkout.paymentCardType != null && { payment_card_type: checkout.paymentCardType }),
    ...(checkout.overrideCapacity === true && { override_capacity: true }),
  };
}

export function toCreateCartPaymentRequestDto(params: CreateCartPaymentParams): CreateCartPaymentRequestDto {
  return {
    ...toTriggerPaymentRequestDto(params),
    ...(params.sessionId != null && { session_id: params.sessionId }),
    ...(params.checkout !== undefined && toCartPaymentCheckoutDto(params.checkout)),
  };
}

function toCartPaymentSession(body: unknown): CartPaymentSession | null {
  if (body === null || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  const transactionId = record['transaction_id'];
  if (typeof transactionId !== 'string' || transactionId.length === 0) {
    return null;
  }
  return {
    transactionId,
    ...(record['block_booker'] === true && { blockBooker: true }),
    ...(record['blocks_purchase_on_failure'] === true && { blocksPurchaseOnFailure: true }),
  };
}

export function fromCreateCartPaymentResponseDto(dto: CreateCartPaymentResponseDto): CreateCartPaymentResponse {
  const session = toCartPaymentSession(dto);
  return { ...fromTriggerResponseDto(dto), ...(session !== null && { session }) };
}

export function getCartPaymentErrorSession(error: unknown): CartPaymentSession | null {
  if (error === null || typeof error !== 'object') {
    return null;
  }
  return toCartPaymentSession((error as { error?: unknown }).error);
}

export function getCartPaymentErrorPaidAmount(error: unknown): number {
  const value: unknown = (error as { error?: { split_paid_amount?: unknown } | null } | null)?.error?.split_paid_amount;
  const amount = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(amount) ? amount : 0;
}

export function fromCancelResponseDto(dto: CancelPaymentResponseDto): CancelPaymentResponse {
  return {
    error: dto.error,
    sessionStatus: dto.session_status === undefined ? undefined : toSplitSessionStatus(dto.session_status),
    status: dto.status === undefined ? undefined : toSplitChargeStatus(dto.status),
    success: dto.success,
  };
}

export function fromStatusDto(dto: PaymentsStatusDto): PaymentsStatus {
  return {
    amount: toNumber(dto.amount),
    createdAt: dto.created_at,
    id: dto.id,
    splitPaidAmount: toNumber(dto.split_paid_amount),
    splits: dto.splits.map(fromSplitDto),
    status: toSplitSessionStatus(dto.status),
    updatedAt: dto.updated_at,
  };
}

/**
 * Returns the split currently driving the checkout: the most recent one by `timestamp` (a status
 * poll returns every past and current attempt, and the active one is always the latest — a retry
 * appends a new leg). Returns `null` when no split has been created yet. Its `status`/`failureCategory`
 * decide whether the checkout keeps polling, settles, or surfaces a terminal failure. Ordering uses
 * `timestamp` because `created_at` is not populated by the poll handler (it serializes as `null`).
 */
export function getLatestSplit(status: PaymentsStatus): PaymentSplit | null {
  if (status.splits.length === 0) {
    return null;
  }
  return status.splits.reduce((latest, split) => (split.timestamp >= latest.timestamp ? split : latest));
}

export function getInProgressSplits(status: PaymentsStatus): PaymentSplit[] {
  return status.splits
    .filter(split => split.status === 'in_progress')
    .sort((left, right) => (left.timestamp < right.timestamp ? -1 : left.timestamp > right.timestamp ? 1 : 0));
}

/**
 * True when the **latest** split (the current attempt) has captured (`success`). Anchoring "paid" on
 * the latest split — not a stale earlier one — is what lets a retry (a new leg) settle correctly
 * while earlier failed legs stay in the history and are ignored.
 */
export function isLatestSplitPaid(status: PaymentsStatus): boolean {
  const latestSplit = getLatestSplit(status);
  return latestSplit !== null && latestSplit.status === 'success';
}

/** True when the whole split session is `completed` (corroborates `split_paid_amount >= total`). */
export function isSessionCompleted(status: PaymentsStatus): boolean {
  return status.status === 'completed';
}

/**
 * Detects a terminal payment failure by inspecting the **latest split** (the attempt currently
 * driving the checkout). A poll keeps one non-terminal split while the terminal is still settling;
 * once that latest split ends in a terminal state — a terminal `status` (`failed`/`canceled`) or a
 * non-null `failureCategory` — the attempt has failed for good. Earlier failed attempts are ignored
 * as long as a newer one is in flight. Returns the latest split's `failureCategory` as the reason so
 * the checkout can stop polling and let the cashier retry. Returns `null` while the latest split is
 * still settling (or when there is no split yet).
 */
export function getPaymentFailure(status: PaymentsStatus): { reason?: PaymentFailureCategory } | null {
  const latestSplit = getLatestSplit(status);
  if (latestSplit === null || !isTerminalFailureSplit(latestSplit)) {
    return null;
  }
  return { reason: latestSplit.failureCategory ?? undefined };
}

export function fromConfirmResponseDto(dto: ConfirmPaymentResponseDto): ConfirmPaymentResponse {
  return { error: dto.error, errorCode: dto.error_code, success: dto.success };
}

export function fromTapToPaySessionResponseDto(dto: TapToPaySessionResponseDto): TapToPaySession {
  const data = dto.data;
  if (data == null || !data.sdk_data || !data.installation_id) {
    throw new TapToPaySessionError(502, TAP_TO_PAY_SESSION_ERROR_INVALID_RESPONSE);
  }
  return { installationId: data.installation_id, sdkData: data.sdk_data };
}

export function getTapToPaySessionErrorCode(error: unknown): string | undefined {
  if (error === null || typeof error !== 'object') {
    return undefined;
  }
  const code: unknown = (error as { error?: { error?: { code?: unknown } | null } | null }).error?.error?.code; // Read defensively: any body may arrive.
  return typeof code === 'string' ? code : undefined;
}

export function toTapToPaySessionError(error: unknown): TapToPaySessionError {
  if (error instanceof TapToPaySessionError) {
    return error;
  }
  if (error instanceof TimeoutError) {
    return new TapToPaySessionError(504, TAP_TO_PAY_SESSION_ERROR_BACKEND_TIMEOUT);
  }
  if (!(error instanceof HttpErrorResponse) || error.status === 0) {
    return new TapToPaySessionError(503, TAP_TO_PAY_SESSION_ERROR_BACKEND_UNREACHABLE);
  }
  return new TapToPaySessionError(error.status, getTapToPaySessionErrorCode(error) ?? TAP_TO_PAY_SESSION_ERROR_UNEXPECTED);
}
