import { Injectable } from '@angular/core';

import { CreateSquarePairingCode, CreateSquarePairingCodeRequestBody } from '@fz-original/app/app/models/payment-checkout-square.model';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class SquareCreatePairingCodeAdapter implements AdapterInterface<BaseResponse<void>> {
  fromApi(response: BaseResponse<void>): BaseResponse<void> {
    return new BaseResponse<void>(response?.data, this.getError(response?.error));
  }

  toApi(body: CreateSquarePairingCode): CreateSquarePairingCodeRequestBody {
    return {
      location_id: body.locationId,
      application_id: body.applicationId,
      idempotency_key: body.idempotencyKey,
      plan_id: body.planId,
      name: body.name,
    };
  }

  private getError(data: BaseErrorResponse) {
    if (!data) {
      return null;
    }
    return { code: data.code, message: `errors.${data.code}` };
  }
}
