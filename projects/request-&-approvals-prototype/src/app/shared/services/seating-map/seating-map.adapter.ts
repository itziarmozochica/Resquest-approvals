import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { SeatingMap } from '../../models/seating-map/seating-map.model';

@Injectable({
  providedIn: 'root',
})
export class SeatingMapAdapter implements AdapterInterface<BaseResponse<SeatingMap>> {
  fromApi(response: any): BaseResponse<SeatingMap> {
    return new BaseResponse<SeatingMap>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    let error = null;
    if (data) {
      error = { code: data.code, message: `errors.${data.code}` };
    }
    return error;
  }

  private getData(data: any): SeatingMap | null {
    if (!data) {
      return null;
    }

    return new SeatingMap(
      data.base_url,
      data.id,
      data.categories,
      data.channels,
      data.number_of_seats ? data.number_of_seats : null,
      data.assigned_seats ? data.assigned_seats : [],
      data.hold_token ? data.hold_token : null,
      data.select_whole_group ? data.select_whole_group : false,
      data.provider_public_key ? data.provider_public_key : null,
      data.seating_pool_id ?? null,
    );
  }
}
