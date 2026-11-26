export const DepositPaymentResultApiStatus = {
  COMPLETED: 'COMPLETED',
  DEPOSIT_EXPIRED: 'DEPOSIT_EXPIRED',
  DEPOSIT_TERMINAL_NON_PAID: 'DEPOSIT_TERMINAL_NON_PAID',
  INCONSISTENT_PAYABLE: 'INCONSISTENT_PAYABLE',
  INCONSISTENT_RESERVATION: 'INCONSISTENT_RESERVATION',
  NO_DEPOSIT: 'NO_DEPOSIT',
  NOT_READY: 'NOT_READY',
} as const;

export interface DepositPaymentResultResponse {
  status: string;
  amount_paid?: string | null;
  currency?: string | null;
  deposit_id?: string | null;
  deposit_status?: string | null;
  reservation_id?: string | null;
}

export interface DepositPaymentResult {
  amountPaid: string | null;
  currency: string | null;
  depositId: string | null;
  depositStatus: string | null;
  reservationId: string | null;
  status: string;
}

export const DEPOSIT_PAYMENT_RESULT_TERMINAL_STATUSES: readonly string[] = [
  DepositPaymentResultApiStatus.DEPOSIT_EXPIRED,
  DepositPaymentResultApiStatus.DEPOSIT_TERMINAL_NON_PAID,
  DepositPaymentResultApiStatus.INCONSISTENT_PAYABLE,
  DepositPaymentResultApiStatus.INCONSISTENT_RESERVATION,
  DepositPaymentResultApiStatus.NO_DEPOSIT,
];

const depositPaymentResultTerminalStatuses: ReadonlySet<string> = new Set(DEPOSIT_PAYMENT_RESULT_TERMINAL_STATUSES);

export function isDepositPaymentStatusCompleted(status: string): boolean {
  return status.toUpperCase() === DepositPaymentResultApiStatus.COMPLETED;
}

export function isDepositPaymentStatusTerminalFailure(status: string): boolean {
  return depositPaymentResultTerminalStatuses.has(status.toUpperCase());
}
