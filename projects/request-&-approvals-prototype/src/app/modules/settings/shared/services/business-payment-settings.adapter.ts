import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import { BusinessPaymentSettings } from '../models/business-payment-settings.model';

@Injectable({
  providedIn: 'root',
})
export class BusinessPaymentSettingsAdapter implements AdapterInterface<BaseResponse<BusinessPaymentSettings>> {
  fromApi(response: any): BaseResponse<BusinessPaymentSettings> {
    return new BaseResponse<BusinessPaymentSettings>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: any): BusinessPaymentSettings | null {
    if (!data) {
      return null;
    }

    return {
      paymentType: data.payment_type,
      invoicingPeriod: data.invoicing_period,
      currency: data.currency,
    };
  }
}
