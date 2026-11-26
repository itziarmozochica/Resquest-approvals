import { Money } from '../money.model';
import { DiscountPaidBy } from './discount-paid-by.enum';

export const RESCHEDULE_COUPON_CREATION_PURPOSE = 'reschedule' as const;

export interface Coupon {
  code: string;
  creationPurpose?: string;
  discount: Money;
  discountPaidBy?: DiscountPaidBy;
  title?: string;
}
