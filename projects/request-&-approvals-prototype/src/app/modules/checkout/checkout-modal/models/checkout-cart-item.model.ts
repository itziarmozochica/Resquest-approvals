import type { Money } from '@fz-original/app/shared/models/money.model';

export type CheckoutCartItemType = 'addOn' | 'ticket';

export interface CheckoutCartItem {
  id: string;
  name: string;
  price: Money;
  type: CheckoutCartItemType;
}
