import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../models/base-response';
import { SeatingConfiguration } from '../../models/seating-configuration/seating-configuration.model';

@Injectable({
  providedIn: 'root',
})
export class SeatingConfigurationAdapter implements AdapterInterface<BaseResponse<SeatingConfiguration>> {
  fromApi(response: any): BaseResponse<SeatingConfiguration> {
    return new BaseResponse<SeatingConfiguration>(this.#getData(response?.data), this.#getError(response?.error));
  }

  #getData(data: any): SeatingConfiguration | null {
    let seatingConfiguration: SeatingConfiguration | null = null;
    if (data) {
      seatingConfiguration = new SeatingConfiguration(data.event_key, data.secret_key);
    }

    return seatingConfiguration;
  }

  #getError(data: any) {
    let error = null;
    if (data) {
      error = { code: data.code, message: `errors.${data.code}` };
    }

    return error;
  }
}
