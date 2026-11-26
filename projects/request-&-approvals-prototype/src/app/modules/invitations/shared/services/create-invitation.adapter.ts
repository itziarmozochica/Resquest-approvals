import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseResponse } from '../../../../shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class CreateInvitationAdapter implements AdapterInterface<BaseResponse<string>> {
  fromApi(response: any): BaseResponse<string> {
    return new BaseResponse<string>(this.getData(response?.data), this.getError(response?.error));
  }

  private getError(data: any): { code: string; message: string } | null {
    if (!data) {
      return null;
    }
    return { code: data.code, message: 'errors.generic' };
  }

  private getData(data: any): string | null {
    if (!data) {
      return null;
    }
    return data.id;
  }
}
