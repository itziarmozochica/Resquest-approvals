import { ConcessionCategoryEnum } from '../../models/concession-category.enum';
import { ConcessionStatusEnum } from '../../models/concession-status.enum';
import { ConcessionTypeEnum } from '../../models/concession-type.enum';
import { B2cSiteConfigurationDto } from './b2c-site-configuration.dto';

export interface ConcessionDto {
  id: string;
  name: string;
  type: ConcessionTypeEnum;
  category: ConcessionCategoryEnum;
  status?: ConcessionStatusEnum;
  channel_id?: string;
  grantee_id?: number;
  grantee_personal_website?: string;
  grantee_tracking_code?: string;
  host?: string;
  grantee: {
    contact_name?: string;
    email?: string;
    address?: string;
    country_code?: string;
    tracking_code?: string;
    host?: string;
    city_code?: string;
    postal_code?: string;
    phone?: string;
    language?: string;
    business_name?: string;
    nif?: string;
  };
  granter_id?: number;
  b2c_site_configuration?: B2cSiteConfigurationDto;
  gl_code?: string | null;
  external_business_id?: string | null;
}

export interface ConcessionsDto {
  concessions: [ConcessionDto];
}
