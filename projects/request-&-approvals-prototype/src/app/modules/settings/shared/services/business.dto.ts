import { BusinessTypeEnum } from '../models/business-type.enum';

export interface UpdateBusinessDTO {
  name?: string;
  email?: string;
  phone?: string;
  channel_id?: string;
  contact_name?: string;
  type?: BusinessTypeEnum;
  address?: string;
  tax_identification_number?: string;
  country_code?: string;
  postal_code?: string;
  city_code?: string;
  region?: string;
  billing_name?: string;
  is_manager?: boolean;
  language?: string;
}
