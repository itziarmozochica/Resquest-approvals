import { Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';

import {
  PERMISSIONS_IN_ALL_WHITELABELS_KEY,
  WHITELABEL_CAN_EDIT_PERMISSION,
  type WhitelabelAccessListData,
  type WhitelabelAccessListResult,
} from '../../models/whitelabel-access.model';

@Injectable({
  providedIn: 'root',
})
export class WhitelabelAccessAdapter {
  fromApi(response: BaseResponse<WhitelabelAccessListData>): WhitelabelAccessListResult {
    const data = response?.data ?? {};
    const permissionsInAll = data[PERMISSIONS_IN_ALL_WHITELABELS_KEY];
    const unrestricted = Array.isArray(permissionsInAll) && permissionsInAll.includes(WHITELABEL_CAN_EDIT_PERMISSION);

    const accesses = Object.entries(data)
      .filter(([key]) => key !== PERMISSIONS_IN_ALL_WHITELABELS_KEY)
      .map(([whitelabelId, permissions]) => ({
        canEdit: Array.isArray(permissions) && permissions.includes(WHITELABEL_CAN_EDIT_PERMISSION),
        whitelabelId,
      }));

    return { unrestricted, accesses };
  }
}
