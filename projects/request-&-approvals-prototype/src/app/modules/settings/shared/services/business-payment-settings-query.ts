import { BusinessPaymentTypeEnum } from '../models/business-payment-type.enum';
import { Currency } from '../models/currency-enum';
import { InvoicingPeriodEnum } from '../models/invoicing-period.enum';

export interface BusinessPaymentSettingsQuery {
  userId: number;
  partnerId: number;
  paymentType?: BusinessPaymentTypeEnum;
  invoicingPeriod?: InvoicingPeriodEnum;
  currency?: Currency;
}

/** `partnerId` is the counterparty; the acting distributor travels in the header. */
export interface DistributorPartnerPaymentSettingsQuery {
  partnerId: number;
}

/** `distributorOrganizationId` is the counterparty; the acting partner travels in the header. */
export interface DistributorPaymentSettingsQuery {
  distributorOrganizationId: number;
}

export interface SetDistributorPaymentInstructionsQuery extends DistributorPaymentSettingsQuery {
  paymentInstructions: string;
}

export interface SetDistributorPaymentSettingsQuery extends DistributorPaymentSettingsQuery {
  paymentType: BusinessPaymentTypeEnum;
  invoicingPeriod?: InvoicingPeriodEnum | null;
  paymentInstructions?: string;
}
