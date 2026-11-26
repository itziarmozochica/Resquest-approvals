import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../../shared/models/base-response';
import { removeEmptyKeys } from '../../../../shared/utils/object.utils';
import { Business, BusinessData } from '../models/business.model';
import { BusinessFiscalDetails, BusinessFormType } from './business-form.type';
import { UpdateBusinessDTO } from './business.dto';

@Injectable({
  providedIn: 'root',
})
export class BusinessAdapter implements AdapterInterface<BaseResponse<Business>> {
  fromApi(response: HttpResponse<BaseResponse<BusinessData>>): BaseResponse<Business> {
    const body: BaseResponse<BusinessData> | null = response.body;
    return new BaseResponse(this.getData(body?.data ?? null), this.getError(body?.error ?? null));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: BusinessData | null | undefined): Business | null {
    let businessData: Business | null = null;

    if (data) {
      const business = data;
      businessData = {
        id: business.id,
        organizationId: business.organization_id ?? null,
        selfManaged: business.self_managed,
        userId: business.user_id,
        name: business.name,
        email: business.email,
        phone: business.phone,
        contactName: business.contact_name,
        type: business.type,
        address: business.address,
        taxIdentificationNumber: business.tax_identification_number,
        language: business.language,
        countryCode: business.country_code,
        postalCode: business.postal_code,
        cityCode: business.city_code,
        region: business.region,
        billingName: business.billing_name,
        isManager: business.is_manager,
        paymentSettings: {
          paymentType: business.payment_settings?.payment_type,
          invoicingPeriod: business.payment_settings?.invoicing_period,
          currency: business.payment_settings?.currency,
        },
        channel: business.channel,
        hasCustomChannel: business.has_custom_channel,
        glCode: business.gl_code,
        externalBusinessId: business.external_business_id,
      };
    }
    return businessData;
  }

  toApi(businessForm: BusinessFormType): UpdateBusinessDTO {
    return removeEmptyKeys({
      name: businessForm.name,
      email: businessForm.email,
      phone: businessForm.phone,
      channel_id: businessForm.channel,
      contact_name: businessForm.contactName,
      business_type: businessForm.type.id,
      address: businessForm.address,
      tax_identification_number: businessForm.taxIdentificationNumber,
      country_code: businessForm.countryCode,
      postal_code: businessForm.postalCode,
      city_code: businessForm.cityCode,
      region: businessForm.region,
      billing_name: businessForm.billingName,
      is_manager: businessForm.isManager,
      language: businessForm.communicationsLanguage,
    });
  }

  toFiscalDetailsApi(fiscalDetails: BusinessFiscalDetails): UpdateBusinessDTO {
    return removeEmptyKeys({
      address: fiscalDetails.address,
      billing_name: fiscalDetails.billingName,
      country_code: fiscalDetails.countryCode,
      postal_code: fiscalDetails.postalCode,
      region: fiscalDetails.region,
      tax_identification_number: fiscalDetails.taxIdentificationNumber,
    });
  }
}
