import { Injectable } from '@angular/core';

import { PermissionsData } from '@fz-original/app/shared/services/user/adapters/permissions.model';

import { AdapterInterface } from '../../../../core/adapter.interface';
import { BaseErrorResponse, BaseResponse } from '../../../models/base-response';

@Injectable({
  providedIn: 'root',
})
export class PermissionsAdapter implements AdapterInterface<BaseResponse<string[]>> {
  fromApi(response: BaseResponse<PermissionsData>): BaseResponse<string[]> {
    return new BaseResponse<string[]>(this.getData(response.data), this.getError(response.error));
  }

  private getError(data: BaseErrorResponse | null | undefined) {
    if (!data) {
      return null;
    }

    return { code: data.code, message: data.message };
  }

  private getData(data: PermissionsData | null): string[] {
    if (data != null) {
      return data.permissions;
    }
    return [];
  }
}
