import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';

import type { PosCheckoutSelectPaymentMethodData } from '../events/pos-checkout-select-payment-method.event';

interface CartCounts {
  addonCount: number;
  itemCount: number;
  planIds: number[];
  shopProductCount: number;
  ticketCount: number;
  timeslotCount: number;
}

export function getCartCountsForPaymentMethodTracking(cart: Cart | null): CartCounts {
  if (cart === null) {
    return {
      addonCount: 0,
      itemCount: 0,
      planIds: [],
      shopProductCount: 0,
      ticketCount: 0,
      timeslotCount: 0,
    };
  }

  let addonCount = 0;
  let shopProductCount = 0;
  let ticketCount = 0;
  const planIds = new Set<number>();

  cart.sessionItemsByDatetime.forEach(sessions => {
    sessions.forEach((session: CartSession) => {
      if (session.mainPlanId) {
        planIds.add(session.mainPlanId);
      }

      const units = session.units ?? 0;
      if (session.sessionType?.isShopProduct) {
        shopProductCount += units;
        return;
      }

      if (session.sessionType?.isAddOn) {
        addonCount += units;
        return;
      }

      ticketCount += units;
    });
  });

  return {
    addonCount,
    itemCount: cart.getNumberOfTicketAndProductCounts(),
    planIds: Array.from(planIds),
    shopProductCount,
    ticketCount,
    timeslotCount: cart.sessionItemsByDatetime.size,
  };
}

export function buildPosCheckoutSelectPaymentMethodData(params: {
  availablePaymentMethods: PaymentType[];
  cart: Cart | null;
  paymentMethod: PaymentType;
  source: PosCheckoutSelectPaymentMethodData['source'];
  totalAmount: number;
}): PosCheckoutSelectPaymentMethodData {
  return {
    ...getCartCountsForPaymentMethodTracking(params.cart),
    availablePaymentMethods: params.availablePaymentMethods,
    paymentMethod: params.paymentMethod,
    source: params.source,
    totalAmount: params.totalAmount,
  };
}
