import { BusinessPaymentTypeEnum } from './business-payment-type.enum';
import { Currency } from './currency-enum';
import { InvoicingPeriodEnum } from './invoicing-period.enum';
import { PaymentSettings } from './payment-settings.model';

export interface BusinessPaymentSettingsData {
  payment_type: BusinessPaymentTypeEnum;
  invoicing_period: InvoicingPeriodEnum | null;
  currency: Currency | null;
}

/** The legacy user-keyed contract. Unlike the distributor one it does carry a `currency`. */
export interface BusinessPaymentSettings extends PaymentSettings {
  currency: Currency | null;
}
