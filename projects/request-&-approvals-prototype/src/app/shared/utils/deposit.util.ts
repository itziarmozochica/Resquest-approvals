import { Deposit } from '../models/deposit/deposit.model';

export function isDepositInFinalStateUtil(deposit?: Deposit | null): boolean {
  return deposit?.status ? ['paid', 'expired', 'cancelled', 'skipped', 'refunded'].includes(deposit.status) : false;
}

export function isDepositPaidUtil(deposit?: Deposit | null): boolean {
  if (deposit?.status === 'refunded') {
    return false;
  }
  return Boolean(deposit?.hasPaidDeposit || deposit?.status === 'paid');
}

export function isDepositPendingStateUtil(deposit?: Deposit | null): boolean {
  return deposit?.status ? ['pending'].includes(deposit.status) : false;
}

export function shouldWarnDepositForfeitOnReservationCancel(deposit?: Deposit | null): boolean {
  return Boolean(deposit?.hasPaidDeposit || deposit?.status === 'paid');
}
