import {
  ModificationPaymentLinkExpiryError,
  ModificationReservationErrorCode,
  modificationReservationUnknownErrorCode,
  type ModificationReservationErrorOutcome,
} from '../models/modification-payment-link.model';

const messageBase = 'boxOffice.modificationPaymentLink.errors';

export const modificationAlreadyPendingMessageKey = `${messageBase}.modificationAlreadyPending`;

export function resolveModificationReservationErrorOutcome(error: unknown): ModificationReservationErrorOutcome {
  switch (readErrorField(error, 'code')) {
    case ModificationReservationErrorCode.CartHoldExpired:
      return { isExpiryError: false, messageKey: `${messageBase}.cartHoldExpired`, returnsToConfirm: true };
    case ModificationReservationErrorCode.CustomerRequired:
      return { isExpiryError: false, messageKey: `${messageBase}.customerRequired`, returnsToConfirm: false };
    case ModificationReservationErrorCode.ExpirationInThePast:
      return {
        isExpiryError: true,
        messageKey: resolveExpiryErrorMessageKey(ModificationPaymentLinkExpiryError.InThePast),
        returnsToConfirm: false,
      };
    case ModificationReservationErrorCode.ModificationAlreadyPending:
      return { isExpiryError: false, messageKey: modificationAlreadyPendingMessageKey, returnsToConfirm: false };
    case ModificationReservationErrorCode.ModificationSuperseded:
      return { isExpiryError: false, messageKey: `${messageBase}.modificationSuperseded`, returnsToConfirm: true };
    case ModificationReservationErrorCode.NothingToPay:
      return { isExpiryError: false, messageKey: `${messageBase}.nothingToPay`, returnsToConfirm: false };
    case ModificationReservationErrorCode.OrderNotModifiable:
      return { isExpiryError: false, messageKey: `${messageBase}.orderNotModifiable`, returnsToConfirm: true };
    default:
      return isOutcomeUnknown(error)
        ? { isExpiryError: false, messageKey: `${messageBase}.outcomeUnknown`, returnsToConfirm: false }
        : { isExpiryError: false, messageKey: `${messageBase}.generic`, returnsToConfirm: false };
  }
}

export function resolveExpiryErrorMessageKey(reason: ModificationPaymentLinkExpiryError): string {
  switch (reason) {
    case ModificationPaymentLinkExpiryError.BeyondSessionDay:
      return `${messageBase}.expiryBeyondSessionDay`;
    case ModificationPaymentLinkExpiryError.InThePast:
      return `${messageBase}.expiryInThePast`;
    default:
      return `${messageBase}.expiryInvalid`;
  }
}

/** Cart creation reports the code on `code`; the grouped reschedule errors report it on `errorCode`. */
export function isModificationAlreadyPendingError(error: unknown): boolean {
  return (
    readErrorField(error, 'code') === ModificationReservationErrorCode.ModificationAlreadyPending ||
    readErrorField(error, 'errorCode') === ModificationReservationErrorCode.ModificationAlreadyPending
  );
}

/** No B2B body: a lost connection (0), a server error (5xx) or the POS's own code. The reservation may already exist. */
function isOutcomeUnknown(error: unknown): boolean {
  const code = readErrorField(error, 'code');
  if (code === undefined || code === modificationReservationUnknownErrorCode) {
    return true;
  }
  const status = Number(code);
  return status === 0 || (status >= 500 && status <= 599);
}

function readErrorField(error: unknown, field: 'code' | 'errorCode'): string | undefined {
  if (error === null || typeof error !== 'object' || !(field in error)) {
    return undefined;
  }
  const value: unknown = (error as Record<typeof field, unknown>)[field]; // `in` proved the key, the cast only names it for the lookup
  return typeof value === 'number' || typeof value === 'string' ? String(value) : undefined;
}
