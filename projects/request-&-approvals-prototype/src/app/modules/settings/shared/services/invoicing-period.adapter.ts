import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import { InvoicingPeriod } from '../models/invoicing-period.model';

@Injectable({
  providedIn: 'root',
})
export class InvoicingPeriodAdapter implements AdapterInterface<BaseResponse<InvoicingPeriod>> {
  fromApi(response: any): BaseResponse<InvoicingPeriod> {
    return new BaseResponse<InvoicingPeriod>(this.getData(response?.body.data), this.getError(response?.body.error));
  }

  private getError(data: any) {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: any): InvoicingPeriod | null {
    if (!data) {
      return null;
    }

    return new InvoicingPeriod(data.starts_at, data.ends_at, data.amount, data.currency);
  }
}
