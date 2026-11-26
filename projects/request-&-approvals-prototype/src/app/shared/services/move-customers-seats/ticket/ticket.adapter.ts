import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../models/base-response';
import { SeatingRelocatedApiResponse } from '../../../models/move-customers-seats';

@Injectable({
  providedIn: 'root',
})
export class TicketAdapter implements AdapterInterface<BaseResponse<void>> {
  fromApi(response: SeatingRelocatedApiResponse): BaseResponse<void> {
    if ('message' in response || ('data' in response && response.data != null)) {
      return new BaseResponse<void>(null, null);
    }
    return new BaseResponse<void>(null, response.error);
  }
}
