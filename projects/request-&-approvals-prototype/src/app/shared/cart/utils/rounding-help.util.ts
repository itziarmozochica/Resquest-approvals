import { getCartTotalMoneyBeforeDeposit } from '@fz-original/app/shared/cart/utils/deposit-cart-breakdown.util';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';

export interface RoundingHelpTranslationParams {
  finalPrice: string;
  rounding: string;
}

export function getRoundingHelpTranslationParams(
  cart: Cart | null | undefined,
  rounding: Money | null,
  locale: string,
): RoundingHelpTranslationParams {
  return {
    finalPrice: getCartTotalMoneyBeforeDeposit(cart)?.toString(locale) ?? '',
    rounding: rounding?.toString(locale) ?? '',
  };
}
