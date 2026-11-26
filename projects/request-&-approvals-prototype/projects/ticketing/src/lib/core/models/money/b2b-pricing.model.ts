import type { Money } from './money.model';

export interface B2bPricing {
  readonly discountPercentage: number;
  readonly wholesalePrice: Money;
}
