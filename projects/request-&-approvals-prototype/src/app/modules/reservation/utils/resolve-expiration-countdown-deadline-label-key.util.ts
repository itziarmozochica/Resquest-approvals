import type { Deposit } from '../../../shared/models/deposit/deposit.model';
import { isDepositPendingStateUtil } from '../../../shared/utils/deposit.util';
import { ReservationDeadlineKind } from '../models/reservation-deadlines.model';

const DEPOSIT_DEADLINE_LABEL_KEY = 'reservation.checkout.paymentSelector.depositDeadlineLabel';
const PAYMENT_DEADLINE_LABEL_KEY = 'reservation.checkout.paymentSelector.paymentDeadlineLabel';

export function resolveExpirationCountdownDeadlineLabelKey(deposit?: Deposit | null): string {
  if (deposit?.status === 'paid') {
    return PAYMENT_DEADLINE_LABEL_KEY;
  }

  if (isDepositPendingStateUtil(deposit)) {
    return DEPOSIT_DEADLINE_LABEL_KEY;
  }

  return PAYMENT_DEADLINE_LABEL_KEY;
}

export function getDeadlineLabelKey(kind: ReservationDeadlineKind): string {
  return kind === ReservationDeadlineKind.DEPOSIT ? DEPOSIT_DEADLINE_LABEL_KEY : PAYMENT_DEADLINE_LABEL_KEY;
}
