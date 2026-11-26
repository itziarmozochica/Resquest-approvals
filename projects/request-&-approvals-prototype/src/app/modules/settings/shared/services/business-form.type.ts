import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';

export interface BusinessFormType {
  id: string;
  type: SelectOption;
  channel?: string;
  name: string;
  email: string;
  countryCode: string;
  contactName: string;
  phone: string;
  taxIdentificationNumber: string;
  billingName: string;
  address: string;
  cityCode: string;
  region: string;
  postalCode: string;
  isManager: boolean;
  communicationsLanguage: string;
  glCode?: string | null;
  externalBusinessId?: string | null;
}

export type BusinessFiscalDetails = Pick<
  BusinessFormType,
  'address' | 'billingName' | 'countryCode' | 'postalCode' | 'region' | 'taxIdentificationNumber'
>;
