import { Injectable } from '@angular/core';

import { SsoLogin, SsoLoginData } from '@fz-original/app/core/authentication/sso-login.model';

import { BaseErrorResponse, BaseResponse } from '../../shared/models/base-response';
import { AdapterInterface } from '../adapter.interface';

@Injectable({
  providedIn: 'root',
})
export class SsoLoginAdapter implements AdapterInterface<BaseResponse<SsoLogin>> {
  fromApi(response: BaseResponse<SsoLoginData>): BaseResponse<SsoLogin> {
    return new BaseResponse<SsoLogin>(this.getData(response.data), this.getError(response.error));
  }

  private getError(data: BaseErrorResponse | null): BaseErrorResponse | null {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  private getData(data: SsoLoginData | null): SsoLogin | null {
    if (data == null) {
      return null;
    }
    return { redirectTo: data.redirect_to };
  }
}
