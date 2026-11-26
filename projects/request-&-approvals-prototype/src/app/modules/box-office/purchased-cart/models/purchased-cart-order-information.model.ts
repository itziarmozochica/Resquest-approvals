import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';

import { FlexibleBundlePurchase } from './flexible-bundle-purchase.model';

export interface PurchasedCartOrderInformation {
  cartSessionsByDatetime: Map<string, CartSession[]>;
  flexibleBundle: FlexibleBundlePurchase | null;
  mainPlan: Plan;
  order: Order;
}
