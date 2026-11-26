import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { DepositStatusEnum } from '@fz-original/app/shared/models/deposit/deposit-status.enum';
import { Deposit } from '@fz-original/app/shared/models/deposit/deposit.model';

export interface DepositTrackingContext {
  currency: string | null;
  depositAmount: number | null;
  depositId: string | null;
  depositStatus: DepositStatusEnum | null;
  hadPaidDeposit: boolean;
  hasDeposit: boolean;
}

export function depositTrackingContextFromCart(cart: Cart | null | undefined): DepositTrackingContext {
  return depositTrackingContextFromDeposit(cart?.deposit, cart?.total?.currency ?? cart?.deposit?.calculatedAmount?.currency);
}

export function depositTrackingContextFromDeposit(deposit: Deposit | null | undefined, currency?: string | null): DepositTrackingContext {
  const depositAmount = deposit?.calculatedAmount?.amount ?? null;
  const resolvedCurrency = currency ?? deposit?.calculatedAmount?.currency ?? null;
  const depositStatus = (deposit?.status as DepositStatusEnum | undefined) ?? null;

  return {
    currency: resolvedCurrency,
    depositAmount,
    depositId: deposit?.id ?? null,
    depositStatus,
    hadPaidDeposit: Boolean(
      deposit?.hasPaidDeposit || depositStatus === DepositStatusEnum.PAID || depositStatus === DepositStatusEnum.REFUNDED,
    ),
    hasDeposit: depositAmount != null && depositAmount > 0,
  };
}
