import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Balance } from '../models/balance.model';

const OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/;

@Injectable({
  providedIn: 'root',
})
export class BalanceAdapter implements AdapterInterface<BaseResponse<Balance>> {
  fromApi(response: any): BaseResponse<Balance> {
    return new BaseResponse<Balance>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    if (!data) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: any): Balance | null {
    if (!data) {
      return null;
    }

    return new Balance(data.amount, data.currency, this.toInstant(data.last_update));
  }

  private toInstant(lastUpdate: string | null | undefined): string | null | undefined {
    if (lastUpdate == null) {
      return lastUpdate;
    }
    return OFFSET.test(lastUpdate) ? lastUpdate : `${lastUpdate}Z`;
  }
}
