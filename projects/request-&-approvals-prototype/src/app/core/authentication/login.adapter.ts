import { Injectable } from '@angular/core';

import { Login, LoginData } from '@fz-original/app/core/authentication/login.model';

import { BaseErrorResponse, BaseResponse } from '../../shared/models/base-response';
import { AdapterInterface } from '../adapter.interface';

@Injectable({
  providedIn: 'root',
})
export class LoginAdapter implements AdapterInterface<BaseResponse<Login>> {
  fromApi(response: BaseResponse<LoginData>): BaseResponse<Login> {
    return new BaseResponse<Login>(this.getData(response.data), this.getError(response.error));
  }

  private getData(data: LoginData | null): Login | null {
    if (data == null) {
      return null;
    }
    return {
      token: data.token,
      userId: data.user_id,
      nextStep: data.next_step,
      enrollmentId: data.enrollment_id,
    };
  }

  private getError(data: BaseErrorResponse | null): BaseErrorResponse | null {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }
}
