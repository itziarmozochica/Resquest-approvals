import { IconProp } from '@fortawesome/fontawesome-svg-core';

import { PaymentType } from './payment-type.enum';

export interface PaymentMethod {
  paymentTransactionId?: string;
  paymentType: PaymentType;
}

export interface PaymentMethodOption {
  disabled?: boolean;
  disabledTooltip?: string;
  icon?: IconProp;
  imageUrl?: string;
  label: string;
  method: PaymentType;
}
