import { BusinessPaymentTypeEnum } from './business-payment-type.enum';
import { InvoicingPeriodEnum } from './invoicing-period.enum';

/**
 * What every payment settings contract agrees on: how the payer settles, and how often when that is
 * invoicing. Callers that only decide on the settlement method read this rather than one of the two
 * shapes below, so the legacy user-keyed read and the rekeyed distributor reads stay interchangeable.
 */
export interface PaymentSettings {
  invoicingPeriod: InvoicingPeriodEnum | null;
  paymentType: BusinessPaymentTypeEnum;
}
