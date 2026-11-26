import { NameData } from '../data/data.model';
import { OrganizationTypeEnum } from './organization-type.enum';
import { PartnerBrand, PartnerBrandData } from './partner-brand.model';
import { PartnerFeaturesData } from './partner-features.model';

export interface PartnerData extends Omit<Partner, 'brand' | 'countryCode' | 'features'> {
  country_code: string;
  brand: PartnerBrandData;
  features?: PartnerFeaturesData;
  external_id?: string;
  external_provider?: string;
}

export interface PartnerTerminology {
  preset: string;
  vocabulary: Record<string, string>;
}

export interface Partner extends NameData<number> {
  countryCode: string;
  email: string;
  brand?: PartnerBrand;
  type?: OrganizationTypeEnum;
  currency?: string;
  currencies?: string[];
  hasMemberAccounts?: boolean;
  hasMemberships?: boolean;
  isBillingPeriodsActive?: boolean;
  externalId?: string;
  externalProvider?: string;
  terminology?: PartnerTerminology;
}

export class PartnerMock {
  constructor(
    public id: number,
    public name: string,
    public countryCode: string,
    public email: string,
    public brand?: PartnerBrand,
    public type?: OrganizationTypeEnum,
    public currency?: string,
    public currencies?: string[],
    public hasMemberships?: boolean,
    public externalId?: string,
    public externalProvider?: string,
    public isBillingPeriodsActive?: boolean,
    public hasMemberAccounts?: boolean,
  ) {}
}
