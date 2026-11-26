import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';

@Injectable({
  providedIn: 'root',
})
export class DiscardCartAdapter implements AdapterInterface<BaseResponse<boolean>> {
  fromApi(response: any): BaseResponse<boolean> {
    return new BaseResponse<boolean>(!response ? true : null, this.getError(response?.error));
  }

  private getError(data: any) {
    let error = null;
    if (data) {
      error = { code: data.code, message: `errors.${data.code}` };
    }
    return error;
  }
}
