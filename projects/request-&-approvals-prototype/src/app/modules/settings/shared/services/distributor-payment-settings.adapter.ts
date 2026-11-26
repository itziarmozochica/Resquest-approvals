import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse, BaseResponseDTO } from '../../../../shared/models/base-response';
import { DistributorPaymentSettings, DistributorPaymentSettingsData } from '../models/distributor-payment-settings.model';

@Injectable({
  providedIn: 'root',
})
export class DistributorPaymentSettingsAdapter implements AdapterInterface<BaseResponse<DistributorPaymentSettings | null>> {
  fromApi(response: BaseResponseDTO<DistributorPaymentSettingsData | null> | null): BaseResponse<DistributorPaymentSettings | null> {
    return new BaseResponse<DistributorPaymentSettings | null>(this.getData(response?.data), this.getError(response?.error));
  }

  private getData(data: DistributorPaymentSettingsData | null | undefined): DistributorPaymentSettings | null {
    if (data == null) {
      return null;
    }

    return {
      distributorOrganizationId: data.distributor_organization_id,
      invoicingPeriod: data.invoicing_period,
      partnerId: data.partner_id,
      paymentInstructions: data.payment_instructions,
      paymentType: data.payment_type,
    };
  }

  private getError(error: BaseErrorResponse | null | undefined) {
    if (error == null) {
      return null;
    }

    return { code: error.code, message: error.message };
  }
}
