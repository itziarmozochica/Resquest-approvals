import type { CheckoutFlowType } from '../../models/checkout.model';

const CHECKOUT_FLOW_TYPE_ANALYTICS_LABEL: Record<CheckoutFlowType, string> = {
  customAmount: 'customAmount',
  customSplit: 'payByItem',
  full: 'full',
  splitEqually: 'splitEqually',
};

export function checkoutFlowTypeAnalyticsLabel(flowType: string | null): string | null {
  if (flowType === null) {
    return null;
  }
  return CHECKOUT_FLOW_TYPE_ANALYTICS_LABEL[flowType as CheckoutFlowType] ?? flowType;
}
