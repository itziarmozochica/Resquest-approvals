import type { Money } from '../../core/models/money/money.model';

export interface CartTaxItem {
  readonly taxAmount: Money;
  readonly taxName: string;
}
