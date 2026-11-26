import { OboPrinterTypeEnum, OnsiteSetup } from '../models/onsite-setup';
import { PaymentConfiguration } from '../services/payment-configuration.model';

export function canPrintOnAdyenTerminal(
  paymentConfiguration: Pick<PaymentConfiguration, 'adyenConfiguration' | 'adyenLocalConfiguration'> | null | undefined,
  onsiteSetup: Pick<OnsiteSetup, 'obo_printer_type'> | null | undefined,
): boolean {
  if (paymentConfiguration?.adyenConfiguration) {
    return true;
  }

  return Boolean(paymentConfiguration?.adyenLocalConfiguration) && onsiteSetup?.obo_printer_type === OboPrinterTypeEnum.adyen_printer;
}
