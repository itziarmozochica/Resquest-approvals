import { Injectable } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '../../shared/models/base-response';
import { AdapterInterface } from '../adapter.interface';
import { BackofficeLogin, BackofficeLoginData } from './backoffice-login.model';

@Injectable({
  providedIn: 'root',
})
export class BackofficeLoginAdapter implements AdapterInterface<BaseResponse<BackofficeLogin>> {
  fromApi(response: BaseResponse<BackofficeLoginData>): BaseResponse<BackofficeLogin> {
    return new BaseResponse<BackofficeLogin>(this.getData(response.data), this.getError(response.error));
  }

  private getData(data: BackofficeLoginData | null): BackofficeLogin | null {
    if (data == null) {
      return null;
    }
    return {
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
