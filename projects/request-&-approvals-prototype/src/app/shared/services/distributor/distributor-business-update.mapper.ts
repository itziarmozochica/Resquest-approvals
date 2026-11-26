import { UpdateDistributor } from '@fz/b2b-iam';

import { BusinessFormType } from '../../../modules/settings/shared/services/business-form.type';

/**
 * The business-form values a distributor can save through `PUT /1.0/distributors/{organizationId}`.
 *
 * Only picks the fields; `@fz/b2b-iam` owns the wire shape, the same way `Distributor` hides it on
 * the read side.
 */
export function toUpdateDistributor(businessForm: BusinessFormType): UpdateDistributor {
  return {
    address: businessForm.address,
    billingName: businessForm.billingName,
    cityCode: businessForm.cityCode,
    contactName: businessForm.contactName,
    countryCode: businessForm.countryCode,
    email: businessForm.email,
    name: businessForm.name,
    phone: businessForm.phone,
    postalCode: businessForm.postalCode,
    region: businessForm.region,
    taxIdentificationNumber: businessForm.taxIdentificationNumber,
  };
}

export function toDistributorFiscalDetails(businessForm: BusinessFormType): UpdateDistributor {
  return {
    address: businessForm.address,
    billingName: businessForm.billingName,
    cityCode: businessForm.cityCode,
    countryCode: businessForm.countryCode,
    postalCode: businessForm.postalCode,
    region: businessForm.region,
    taxIdentificationNumber: businessForm.taxIdentificationNumber,
  };
}
