import type { Money } from '../../core/models/money/money.model';

export type CartAdjustmentPriceCalculation = 'fixed' | 'percentage' | 'final';
export type CartAdjustmentPriceOperation = 'add' | 'subtract';
export interface CartAdjustmentRounding {
  readonly amount: Money;
}

export interface CartAdjustmentPrice {
  readonly amount: number;
  readonly calculation: CartAdjustmentPriceCalculation;
  readonly concept: string;
  readonly couponCode?: string;
  readonly id?: string;
  readonly operation?: CartAdjustmentPriceOperation;
  readonly rounded?: CartAdjustmentRounding;
  readonly total?: Money;
}

export interface CartSessionAdjustmentPrice {
  readonly totalPriceWithoutOverride: Money;
  readonly totalPriceWithOverride: Money;
  readonly totalSurchargeWithoutOverride: Money;
  readonly totalSurchargeWithOverride: Money;
}
