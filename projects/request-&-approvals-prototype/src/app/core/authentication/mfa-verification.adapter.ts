import { Injectable } from '@angular/core';

import { MfaVerification, MfaVerificationData } from '@fz-original/app/core/authentication/mfa-verification.model';

import { BaseResponse } from '../../shared/models/base-response';
import { AdapterInterface } from '../adapter.interface';
import { BaseAdapter } from '../base.adapter';

@Injectable({
  providedIn: 'root',
})
export class MfaVerificationAdapter extends BaseAdapter implements AdapterInterface<BaseResponse<MfaVerification>> {
  fromApi(response: BaseResponse<MfaVerificationData>): BaseResponse<MfaVerification> {
    return new BaseResponse<MfaVerification>(this.getData(response.data), this.getError(response.error));
  }

  private getData(data: MfaVerificationData | null): MfaVerification | null {
    if (data == null) {
      return null;
    }
    return {
      token: data.token,
      userId: data.user_id,
      recoveryCodes: data.recovery_codes ?? null,
    };
  }
}
