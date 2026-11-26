import type { DecimalAmount } from './decimal-amount';

export interface Money {
  amount: DecimalAmount;
  currency: string;
}
