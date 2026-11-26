import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { LinkPaginationResponse } from '../../../../shared/models/link-pagination-response';
import { BusinessSummary } from '../models/business-summary.model';
import { Business, BusinessesData } from '../models/business.model';

@Injectable({
  providedIn: 'root',
})
export class BusinessesAdapter implements AdapterInterface<LinkPaginationResponse<BusinessSummary>> {
  fromApi(response: HttpResponse<BaseResponse<BusinessesData>>): LinkPaginationResponse<BusinessSummary> {
    const body: BaseResponse<BusinessesData, any> | null = response.body;
    return new LinkPaginationResponse<BusinessSummary>(
      response.headers.get('Link'),
      this.getData(body?.data ?? null),
      this.getError(body?.error ?? null),
    );
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: BusinessesData | null | undefined): BusinessSummary | null {
    let businessSummary: BusinessSummary | null = null;
    if (data != null && data.businesses) {
      const total: number = data.count;
      const businesses: Business[] = data.businesses.map(business => {
        return {
          id: business.id,
          organizationId: business.organization_id ?? null,
          userId: business.user_id,
          name: business.name,
          email: business.email,
          phone: business.phone,
          contactName: business.contact_name,
          type: business.type,
          address: business.address,
          taxIdentificationNumber: business.tax_identification_number,
          language: business.language,
          isManager: business.is_manager,
          paymentSettings: {
            paymentType: business.payment_settings?.payment_type,
            invoicingPeriod: business.payment_settings?.invoicing_period,
            currency: business.payment_settings?.currency,
          },
          channel: business.channel,
          hasCustomChannel: business.has_custom_channel,
        };
      });
      businessSummary = { total, businesses };
    }
    return businessSummary;
  }
}
