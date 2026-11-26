import type { CheckoutContext, CheckoutFlowKind, CheckoutModalData, CheckoutPaymentMethodDescriptor } from '../models/checkout.model';
import { findDefaultCheckoutCardMethod, findDefaultCheckoutCashMethod } from '../utils/checkout-payment.util';
import type { CheckoutModalConfig } from './checkout-flow.shared';
import { checkoutModalConfig } from './checkout-modal.config';
import { fullPaymentCashCheckoutConfig } from './full-payment-cash-checkout.config';
import { fullPaymentCheckoutConfig } from './full-payment-checkout.config';
import { fullPaymentIntegratedCheckoutConfig } from './full-payment-integrated-checkout.config';

export interface CheckoutFlowDefinition {
  config: CheckoutModalConfig;
  preselectMethod: (context: CheckoutContext) => CheckoutPaymentMethodDescriptor | null;
}

export const CHECKOUT_MODAL_FLOWS: Record<CheckoutFlowKind, CheckoutFlowDefinition> = {
  fullCheckout: { config: checkoutModalConfig, preselectMethod: findDefaultCheckoutCardMethod },
  fullPaymentCash: { config: fullPaymentCashCheckoutConfig, preselectMethod: findDefaultCheckoutCashMethod },
  fullPaymentIntegrated: { config: fullPaymentIntegratedCheckoutConfig, preselectMethod: findDefaultCheckoutCardMethod },
};

const FULL_PAYMENT_ONLY_FLOW: CheckoutFlowDefinition = {
  config: fullPaymentCheckoutConfig,
  preselectMethod: findDefaultCheckoutCardMethod,
};

export function resolveCheckoutFlow(data: CheckoutModalData | null): CheckoutFlowDefinition {
  const kind = data?.flow ?? 'fullCheckout';
  const flows = data?.checkoutFlows;
  if (kind === 'fullCheckout' && flows?.length === 1 && flows[0] === 'full') {
    return FULL_PAYMENT_ONLY_FLOW;
  }
  return CHECKOUT_MODAL_FLOWS[kind];
}
