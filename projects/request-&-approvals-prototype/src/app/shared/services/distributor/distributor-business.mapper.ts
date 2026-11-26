import { DistributorBusiness } from '@fz/b2b-iam';

import { BusinessTypeEnum } from '../../../modules/settings/shared/models/business-type.enum';
import { Business } from '../../../modules/settings/shared/models/business.model';

export function toFeverZoneBusiness(business: DistributorBusiness): Business {
  return {
    id: business.id,
    userId: business.userId,
    ownerUserId: business.ownerUserId,
    name: business.name,
    email: business.email,
    phone: business.phone,
    contactName: business.contactName,
    type: BusinessTypeEnum.AGENCY,
    address: business.address,
    taxIdentificationNumber: business.taxIdentificationNumber,
    language: business.language,
    countryCode: business.countryCode,
    postalCode: business.postalCode,
    cityCode: business.cityCode,
    region: business.region,
    billingName: business.billingName,
    channel: '',
    hasCustomChannel: false,
    selfManaged: business.selfManaged,
  };
}
