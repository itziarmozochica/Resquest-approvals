import { BusinessPaymentTypeEnum } from './business-payment-type.enum';
import { InvoicingPeriodEnum } from './invoicing-period.enum';
import { PaymentSettings } from './payment-settings.model';

export const PAYMENT_INSTRUCTIONS_MAX_LENGTH = 2048;

/**
 * The rekeyed contract, keyed by the (distributor, partner) pairing. It carries no `currency`: the
 * balance owns it since B2BR-5736, so a currency read off payment settings would be reading a field
 * the service does not send.
 */
export interface DistributorPaymentSettingsData {
  distributor_organization_id: number;
  invoicing_period: InvoicingPeriodEnum | null;
  partner_id: number;
  payment_instructions: string | null;
  payment_type: BusinessPaymentTypeEnum;
}

export interface DistributorPaymentSettings extends PaymentSettings {
  distributorOrganizationId: number;
  partnerId: number;
  paymentInstructions: string | null;
}
