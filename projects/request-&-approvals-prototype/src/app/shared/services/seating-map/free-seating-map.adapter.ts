import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { FreeSeatingMap } from '../../models/seating-map/free-seating-map.model';

@Injectable({
  providedIn: 'root',
})
export class FreeSeatingMapAdapter implements AdapterInterface<BaseResponse<FreeSeatingMap>> {
  fromApi(response: any): BaseResponse<FreeSeatingMap> {
    return new BaseResponse<FreeSeatingMap>(this.#getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any) {
    let error = null;
    if (data) {
      error = { code: data.code, message: `errors.${data.code}` };
    }
    return error;
  }

  #getData(data: unknown): FreeSeatingMap | null {
    if (!data) {
      return null;
    }
    const { url, state } = data as { url: string; state: string };
    return new FreeSeatingMap(url, state);
  }
}
