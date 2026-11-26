import { Injectable } from '@angular/core';

import { MfaRecovery, MfaRecoveryData } from '@fz-original/app/core/authentication/mfa-recovery.model';
import { BaseAdapter } from '@fz-original/app/core/base.adapter';

import { BaseResponse } from '../../shared/models/base-response';
import { AdapterInterface } from '../adapter.interface';

@Injectable({
  providedIn: 'root',
})
export class MfaRecoveryAdapter extends BaseAdapter implements AdapterInterface<BaseResponse<MfaRecovery>> {
  fromApi(response: BaseResponse<MfaRecoveryData>): BaseResponse<MfaRecovery> {
    return new BaseResponse<MfaRecovery>(this.getData(response.data), this.getError(response.error));
  }

  private getData(data: MfaRecoveryData | null): MfaRecovery | null {
    if (data == null) {
      return null;
    }
    return {
      token: data.token,
      userId: data.user_id,
    };
  }
}
