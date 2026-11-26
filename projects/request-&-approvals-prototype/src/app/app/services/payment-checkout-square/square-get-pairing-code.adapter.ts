import { Injectable } from '@angular/core';

import { SquarePairingCode, SquarePairingCodeResponse } from '@fz-original/app/app/models/payment-checkout-square.model';
import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class SquareGetPairingCodeAdapter implements AdapterInterface<BaseResponse<SquarePairingCode>> {
  fromApi(response: BaseResponse<SquarePairingCodeResponse>): BaseResponse<SquarePairingCode> {
    return new BaseResponse<SquarePairingCode>(this.getResponseData(response.data), this.getError(response?.error));
  }

  private getResponseData(response: SquarePairingCodeResponse | null): SquarePairingCode | null {
    if (response === null) {
      return null;
    }

    return {
      pairingCodeId: response.terminal_pairing_intent_id,
      pairingCode: response.pairing_code,
    };
  }

  private getError(data: BaseErrorResponse) {
    if (!data) {
      return null;
    }
    return { code: data.code, message: `errors.${data.code}` };
  }
}
