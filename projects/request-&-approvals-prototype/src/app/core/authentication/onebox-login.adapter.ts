import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '../../shared/models/base-response';
import { AdapterInterface } from '../adapter.interface';
import { OneboxLogin, OneboxLoginData } from './onebox-login.model';

@Injectable({
  providedIn: 'root',
})
export class OneboxLoginAdapter implements AdapterInterface<BaseResponse<OneboxLogin>> {
  fromApi(response: BaseResponse<OneboxLoginData>): BaseResponse<OneboxLogin> {
    return new BaseResponse<OneboxLogin>(this.getData(response.data), this.getError(response.error));
  }

  private getData(data: OneboxLoginData | null): OneboxLogin | null {
    if (data == null) {
      return null;
    }
    return {
      organizationId: data.organization_id,
      token: data.token,
      userId: data.user_id,
    };
  }

  private getError(data: BaseErrorResponse | null): BaseErrorResponse | null {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
