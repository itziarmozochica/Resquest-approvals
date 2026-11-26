import { PaymentCheckout, PaymentCheckoutET } from '@fz-original/app/app/enums/payment.enum';
import { PaymentType } from '@fz-original/app/modules/box-office/checkout/models/payment-type.enum';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';

import { PaymentConfiguration } from '../../../shared/services/payment-configuration.model';
import type { PosCheckoutPaymentCompletedData } from '../events/pos-checkout-payment-completed.event';
import type { PosCheckoutPaymentFailedData } from '../events/pos-checkout-payment-failed.event';

const CARD_PAYMENT_TYPES: readonly PaymentType[] = [
  PaymentType.CARD,
  PaymentType.CREDIT_CARD,
  PaymentType.DEBIT_CARD,
  PaymentType.CARD_SPLIT,
];

interface PaymentTrackingError {
  error?: { code?: string | number; message?: string };
  message?: string;
}

export function collectPlanIdsFromCart(cart: Cart | null): number[] {
  if (!cart?.sessionItemsByDatetime) {
    return [];
  }

  const planIds = new Set<number>();
  cart.sessionItemsByDatetime.forEach(sessions => {
    sessions.forEach(session => {
      if (session.mainPlanId != null) {
        planIds.add(session.mainPlanId);
      }
    });
  });

  return Array.from(planIds);
}

export function countTimeslotsInCart(cart: Cart | null): number {
  if (!cart?.sessionItemsByDatetime) {
    return 0;
  }

  return Array.from(cart.sessionItemsByDatetime.keys()).filter(key => key !== 'products').length;
}

export function buildPosCheckoutPaymentCompletedData(cart: Cart, paymentMethod: PaymentType): PosCheckoutPaymentCompletedData {
  return {
    itemCount: cart.getNumberOfTicketAndProductCounts(),
    paymentMethod,
    planIds: collectPlanIdsFromCart(cart),
    timeslotCount: countTimeslotsInCart(cart),
    totalAmount: cart.total?.amount ?? 0,
  };
}

export function buildPosCheckoutPaymentFailedData(
  cart: Cart | null,
  paymentMethod: PaymentType,
  error: unknown,
): PosCheckoutPaymentFailedData {
  return {
    failureReason: extractPaymentFailureReason(error),
    paymentMethod,
    planIds: collectPlanIdsFromCart(cart),
  };
}

export function extractPaymentFailureReason(error: unknown): string {
  if (typeof error === 'string') {
    const [, message, code] = error.split(',');
    return String(code ?? message ?? error);
  }

  const typedError = error as PaymentTrackingError;
  const code = typedError.error?.code;
  if (code != null && code !== '') {
    return String(code);
  }

  return String(typedError.error?.message ?? typedError.message ?? 'unknown');
}

export function shouldTrackAdyenPaymentStarted(
  paymentType: PaymentType | null,
  storedPaymentConfig: PaymentConfiguration | null | undefined,
  gatewayProvider: PaymentCheckoutET | 'undefined',
): boolean {
  if (paymentType == null || !CARD_PAYMENT_TYPES.includes(paymentType)) {
    return false;
  }

  if (!storedPaymentConfig?.adyenConfiguration && !storedPaymentConfig?.adyenLocalConfiguration) {
    return false;
  }

  return gatewayProvider === PaymentCheckout[PaymentCheckout.adyen] || gatewayProvider === PaymentCheckout[PaymentCheckout.adyen_local];
}
