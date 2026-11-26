import { Money } from '../money.model';

export interface OrderTaxes {
  name: string;
  baseAmount: Money;
  rate: number;
  totalAmount: Money;
}
