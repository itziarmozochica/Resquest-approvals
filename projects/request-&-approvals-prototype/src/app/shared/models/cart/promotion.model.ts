import { Money } from '../money.model';
import { PromotionPaidBy } from './promotion-paid-by.enum';

export interface Promotion {
  discount: Money;
  discountPaidBy: PromotionPaidBy;
  name: string;
}
