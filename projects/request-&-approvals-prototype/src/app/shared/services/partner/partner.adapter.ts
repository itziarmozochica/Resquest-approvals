import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { PartnerBrand } from '../../models/partner/partner-brand.model';
import { Partner, PartnerData } from '../../models/partner/partner.model';

@Injectable({
  providedIn: 'root',
})
export class PartnerAdapter implements AdapterInterface<BaseResponse<Partner>> {
  fromApi(response: BaseResponse<PartnerData>): BaseResponse<Partner> {
    return new BaseResponse<Partner>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    if (!data) {
      return null;
    }
    return { code: data.code, message: `errors.${data.code}` };
  }

  private getData(data: PartnerData | null | undefined): Partner | null {
    if (data == null) {
      return null;
    }
    const { country_code, features, external_id, external_provider, ...partner } = data;
    return {
      ...partner,
      countryCode: country_code,
      brand: data.brand !== undefined ? new PartnerBrand(data.brand.kiosk_logo_header, data.brand.feverzone_logo_header) : undefined,
      hasMemberships: !!features?.memberships,
      hasMemberAccounts: !!features?.member_accounts,
      isBillingPeriodsActive: !!features?.billing_periods_active,
      externalId: external_id,
      externalProvider: external_provider,
    };
  }
}
