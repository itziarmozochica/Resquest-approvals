import { PaymentConfigurationCheckoutFlow } from '../../../shared/models/payment-configuration';
import { PaymentConfigurationDirectButtonsPreviewButton } from '../payment-configuration-direct-buttons-preview/payment-configuration-direct-buttons-preview.model';
import { PaymentConfigurationMethodsPreviewItem } from '../payment-configuration-methods-preview/payment-configuration-methods-preview.model';

export interface PaymentConfigurationPreviewPanelData {
  checkoutFlows?: PaymentConfigurationCheckoutFlow[];
  directButtons?: PaymentConfigurationDirectButtonsPreviewButton[];
  methods?: PaymentConfigurationMethodsPreviewItem[];
}
