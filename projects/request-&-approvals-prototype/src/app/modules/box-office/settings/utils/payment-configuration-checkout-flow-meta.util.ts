import { IgntIconName } from '@ignite/icon';

import { PaymentConfigurationCheckoutFlow } from '../../shared/models/payment-configuration';

export interface PaymentConfigurationCheckoutFlowMeta {
  descriptionKey: string;
  icon: IgntIconName;
  labelKey: string;
}

export const CHECKOUT_FLOW_META: Record<PaymentConfigurationCheckoutFlow, PaymentConfigurationCheckoutFlowMeta> = {
  custom_split: { descriptionKey: 'checkout.options.customAmountDescription', icon: 'edit', labelKey: 'checkout.options.customAmount' },
  full_payment: { descriptionKey: 'checkout.options.payInFullDescription', icon: 'dollar-sign', labelKey: 'checkout.options.payInFull' },
  pay_by_item: { descriptionKey: 'checkout.options.payByItemDescription', icon: 'list', labelKey: 'checkout.options.payByItem' },
  split_equally: {
    descriptionKey: 'checkout.options.splitEquallyDescription',
    icon: 'balance-scale',
    labelKey: 'checkout.options.splitEqually',
  },
};
