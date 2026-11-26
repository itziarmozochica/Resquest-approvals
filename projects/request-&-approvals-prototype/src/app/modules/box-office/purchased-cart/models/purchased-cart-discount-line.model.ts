import { Money } from '@fz-original/app/shared/models/money.model';

export enum PurchasedCartDiscountLineType {
  BundleDiscount = 'bundle-discount',
  Coupon = 'coupon',
}

export interface PurchasedCartDiscountLine {
  amount: Money;
  label: string;
  type: PurchasedCartDiscountLineType;
}
