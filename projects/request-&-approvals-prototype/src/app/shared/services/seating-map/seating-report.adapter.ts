import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { SeatingMap } from '../../models/seating-map/seating-map.model';

@Injectable({
  providedIn: 'root',
})
export class SeatingReportAdapter implements AdapterInterface<BaseResponse<null>> {
  fromApi(response: any): BaseResponse<null> {
    return new BaseResponse<null>(response?.data, this.getError(response?.error));
  }

  private getError(data: any) {
    let error = null;
    if (data) {
      error = { code: data.code, message: `errors.${data.code}` };
    }
    return error;
  }
}
