import { BusinessPaymentSettings, BusinessPaymentSettingsData } from './business-payment-settings.model';
import { BusinessTypeEnum } from './business-type.enum';

export interface BusinessesData {
  businesses: {
    id: string;
    organization_id?: number | null;
    user_id: number;
    name: string;
    email: string;
    phone: string;
    contact_name: string;
    type: BusinessTypeEnum;
    address: string;
    language: string;
    tax_identification_number: string;
    is_manager: boolean;
    payment_settings: BusinessPaymentSettingsData;
    channel: string;
    has_custom_channel: boolean;
  }[];
  count: number;
}

export type UserApiBusinessData = Omit<BusinessData, 'type'>;

export interface CreatedBusinessData {
  business_id: string;
  user_id: number;
}

export interface BusinessData {
  id: string;
  organization_id?: number | null;
  self_managed?: boolean;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  contact_name: string;
  type: BusinessTypeEnum;
  address: string;
  tax_identification_number: string;
  language: string;
  country_code: string;
  postal_code: string;
  city_code: string;
  region: string;
  billing_name: string;
  is_manager: boolean;
  payment_settings: BusinessPaymentSettingsData;
  channel: string;
  has_custom_channel: boolean;
  gl_code?: string | null;
  external_business_id?: string | null;
}

export interface Business {
  id: string;
  /**
   * Distributor organization the business is linked to, `null` when it has none.
   * Keys the distributor-scoped balance read; a business without one can only be
   * read through the legacy booking-agent endpoints.
   */
  organizationId?: number | null;
  userId: number;
  ownerUserId?: number | null;
  name: string;
  email: string;
  phone: string;
  contactName: string;
  type: BusinessTypeEnum;
  address: string;
  taxIdentificationNumber: string;
  language: string;
  countryCode?: string;
  postalCode?: string;
  cityCode?: string;
  region?: string;
  billingName?: string;
  paymentSettings?: BusinessPaymentSettings;
  isManager?: boolean;
  channel: string;
  hasCustomChannel: boolean;
  glCode?: string | null;
  externalBusinessId?: string | null;
  selfManaged?: boolean;
}
