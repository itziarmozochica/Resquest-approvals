export enum ReservationDeadlineKind {
  DEPOSIT = 'deposit',
  PAYMENT = 'payment',
}

export enum ReservationDeadlinesErrorCode {
  DEADLINES_EARLIER_THAN_CURRENT = 'DEADLINES_EARLIER_THAN_CURRENT',
  DEADLINES_IN_THE_PAST = 'DEADLINES_IN_THE_PAST',
  DEADLINES_OVERRIDE_NOT_ENABLED = 'DEADLINES_OVERRIDE_NOT_ENABLED',
  DEPOSIT_DEADLINE_AFTER_PAYMENT_DEADLINE = 'DEPOSIT_DEADLINE_AFTER_PAYMENT_DEADLINE',
  DEPOSIT_DEADLINE_EARLIER_THAN_CURRENT = 'DEPOSIT_DEADLINE_EARLIER_THAN_CURRENT',
  DEPOSIT_DEADLINE_IN_THE_PAST = 'DEPOSIT_DEADLINE_IN_THE_PAST',
  DEPOSIT_DEADLINE_NOT_EDITABLE = 'DEPOSIT_DEADLINE_NOT_EDITABLE',
  DEPOSIT_DEADLINE_OVERRIDE_NOT_ENABLED = 'DEPOSIT_DEADLINE_OVERRIDE_NOT_ENABLED',
  PAYMENT_DEADLINE_AFTER_SESSION_START = 'PAYMENT_DEADLINE_AFTER_SESSION_START',
  PAYMENT_DEADLINE_EARLIER_THAN_CURRENT = 'PAYMENT_DEADLINE_EARLIER_THAN_CURRENT',
  RESERVATION_DEADLINE_IN_THE_PAST = 'RESERVATION_DEADLINE_IN_THE_PAST',
  RESERVATION_DEADLINE_OVERRIDE_NOT_ENABLED = 'RESERVATION_DEADLINE_OVERRIDE_NOT_ENABLED',
  RESERVATION_DEADLINES_NOT_EDITABLE = 'RESERVATION_DEADLINES_NOT_EDITABLE',
}

export const RESERVATION_DEADLINES_ERROR_CODE_BY_STATUS_CODE: Readonly<Record<string, ReservationDeadlinesErrorCode>> = {
  '23030141': ReservationDeadlinesErrorCode.RESERVATION_DEADLINES_NOT_EDITABLE,
  '23030143': ReservationDeadlinesErrorCode.RESERVATION_DEADLINE_IN_THE_PAST,
  '23030145': ReservationDeadlinesErrorCode.PAYMENT_DEADLINE_AFTER_SESSION_START,
  '23030147': ReservationDeadlinesErrorCode.RESERVATION_DEADLINE_OVERRIDE_NOT_ENABLED,
  '23030149': ReservationDeadlinesErrorCode.PAYMENT_DEADLINE_EARLIER_THAN_CURRENT,
};

export const DEPOSIT_DEADLINE_ERROR_CODE_BY_STATUS_CODE: Readonly<Record<string, ReservationDeadlinesErrorCode>> = {
  '23030141': ReservationDeadlinesErrorCode.DEPOSIT_DEADLINE_NOT_EDITABLE,
  '23030142': ReservationDeadlinesErrorCode.DEPOSIT_DEADLINE_NOT_EDITABLE,
  '23030143': ReservationDeadlinesErrorCode.DEPOSIT_DEADLINE_IN_THE_PAST,
  '23030144': ReservationDeadlinesErrorCode.DEPOSIT_DEADLINE_AFTER_PAYMENT_DEADLINE,
  '23030147': ReservationDeadlinesErrorCode.DEPOSIT_DEADLINE_OVERRIDE_NOT_ENABLED,
  '23030149': ReservationDeadlinesErrorCode.DEPOSIT_DEADLINE_EARLIER_THAN_CURRENT,
};

export interface ReservationDeadlinesError {
  code: ReservationDeadlinesErrorCode;
  kind: ReservationDeadlineKind | null;
}

// With both deadlines sent, a code both of them share cannot name the field that failed, so it has no kind.
export const BOTH_DEADLINES_ERROR_BY_STATUS_CODE: Readonly<Record<string, ReservationDeadlinesError>> = {
  '23030141': { code: ReservationDeadlinesErrorCode.RESERVATION_DEADLINES_NOT_EDITABLE, kind: ReservationDeadlineKind.PAYMENT },
  '23030142': { code: ReservationDeadlinesErrorCode.DEPOSIT_DEADLINE_NOT_EDITABLE, kind: ReservationDeadlineKind.DEPOSIT },
  '23030143': { code: ReservationDeadlinesErrorCode.DEADLINES_IN_THE_PAST, kind: null },
  '23030144': { code: ReservationDeadlinesErrorCode.DEPOSIT_DEADLINE_AFTER_PAYMENT_DEADLINE, kind: ReservationDeadlineKind.DEPOSIT },
  '23030145': { code: ReservationDeadlinesErrorCode.PAYMENT_DEADLINE_AFTER_SESSION_START, kind: ReservationDeadlineKind.PAYMENT },
  '23030147': { code: ReservationDeadlinesErrorCode.DEADLINES_OVERRIDE_NOT_ENABLED, kind: null },
  '23030149': { code: ReservationDeadlinesErrorCode.DEADLINES_EARLIER_THAN_CURRENT, kind: null },
};

export interface ReservationDepositDeadlineDTO {
  editable: boolean;
  latest_allowed?: string | null;
  value: string;
}

export interface ReservationPaymentDeadlineDTO {
  editable?: boolean;
  latest_allowed: string | null;
  value: string;
}

export interface ReservationDeadlinesDTO {
  deposit_deadline?: ReservationDepositDeadlineDTO | null;
  /** @deprecated Read `payment_deadline.editable`; kept while fever2 rolls out. */
  editable: boolean;
  payment_deadline: ReservationPaymentDeadlineDTO;
  timezone: string;
}

export interface ReservationDeadlinesUpdateDTO {
  deposit_deadline?: string;
  payment_deadline?: string;
}

export interface ReservationDepositDeadline {
  editable: boolean;
  latestAllowed: string;
  value: string;
}

export interface ReservationPaymentDeadline {
  editable: boolean;
  latestAllowed: string | null;
  value: string;
}

export interface ReservationDeadlines {
  depositDeadline: ReservationDepositDeadline | null;
  paymentDeadline: ReservationPaymentDeadline;
  timezone: string;
}

export interface ReservationDeadlinesUpdate {
  depositDeadline?: string;
  paymentDeadline?: string;
}
