import { Observable } from 'rxjs';

import { PaymentConfigurationTerminalInput } from '../../../shared/models/payment-configuration';

export interface PaymentConfigurationConnectDeviceTarget {
  configurationId: string;
}

export interface PaymentConfigurationConnectDeviceDialogData {
  ipAddress: string;
  /**
   * Saves the payment configuration and answers where the device has to be connected. The key can
   * only be sealed against a configuration that exists, so this runs before the device is touched.
   */
  saveBeforeConnect: () => Observable<PaymentConfigurationConnectDeviceTarget>;
}

export interface PaymentConfigurationConnectDeviceDialogResult {
  keyVersion: number | null;
  terminal: PaymentConfigurationTerminalInput;
}
