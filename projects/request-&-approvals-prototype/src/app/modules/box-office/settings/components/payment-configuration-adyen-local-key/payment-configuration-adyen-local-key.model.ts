import { AdyenLocalProviderConfig } from '../../../shared/models/payment-configuration';

export interface PaymentConfigurationAdyenLocalKeyChange {
  /** Null while the form cannot produce a key: an unfinished draft is not a provider config. */
  state: AdyenLocalProviderConfig | null;
  valid: boolean;
}
