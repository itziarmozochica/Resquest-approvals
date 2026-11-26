import { IgntButtonIcon } from '@ignite/common';

import { PaymentConfigurationDirectButtonSlotId } from '../payment-configuration-direct-buttons/payment-configuration-direct-buttons.model';

export interface PaymentConfigurationDirectButtonsPreviewButton {
  label: string;
  slot: PaymentConfigurationDirectButtonSlotId;
  icon?: IgntButtonIcon;
}
