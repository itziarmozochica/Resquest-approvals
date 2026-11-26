import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseResponse } from '../../../shared/models/base-response';
import { NewReservation } from '../models/new-reservation.model';

@Injectable({ providedIn: 'root' })
export class NewReservationAdapter implements AdapterInterface<BaseResponse<NewReservation>> {
  fromApi(response: any): BaseResponse<NewReservation> {
    return new BaseResponse<NewReservation>(this.getData(response?.data), this.getError(response?.error));
  }

  private getData(data: any): NewReservation | null {
    if (!data) {
      return null;
    }

    return { id: data.id, expiresAt: data.expires_at, locator: data.locator };
  }

  private getError(error: any): any {
    if (!error) {
      return null;
    }
    return { code: error.code, message: `errors.${error.code}`, error: error.error, errorCode: error.errorCode };
  }
}
