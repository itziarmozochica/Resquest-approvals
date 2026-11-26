import { PAYMENT_CONFIGURATION_DIRECT_PAYMENT_BUTTON_LIMIT } from '../models/payment-configuration';

export const EXTERNAL_METHOD_SUFFIX_KEY = 'checkout.method.external';

export function isCheckoutScreenForced(methodCount: number, offersSplitFlows: boolean): boolean {
  return offersSplitFlows || methodCount > PAYMENT_CONFIGURATION_DIRECT_PAYMENT_BUTTON_LIMIT;
}

export function methodLabelSuffixKey(provider: string | null): string | null {
  if (provider === 'delegated') {
    return EXTERNAL_METHOD_SUFFIX_KEY;
  }
  if (provider === null || provider.length === 0) {
    return null;
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
