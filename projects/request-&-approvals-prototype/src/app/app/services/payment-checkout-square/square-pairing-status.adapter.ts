import { Injectable } from '@angular/core';

import { PairingStatus, SquarePairingStatusResponse } from '@fz-original/app/app/models/payment-checkout-square.model';
import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class SquarePairingStatusAdapter implements AdapterInterface<BaseResponse<PairingStatus>> {
  fromApi(response: BaseResponse<SquarePairingStatusResponse>): BaseResponse<PairingStatus> {
    return new BaseResponse<PairingStatus>(this.getResponseData(response.data), this.getError(response.error));
  }

  private getResponseData(responseData: SquarePairingStatusResponse | null): PairingStatus | null {
    return responseData !== null
      ? {
          externalId: responseData.external_id,
        }
      : null;
  }

  private getError(data: BaseErrorResponse) {
    if (!data) {
      return null;
    }
    return { code: data.code, message: `errors.${data.code}` };
  }
}
