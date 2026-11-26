import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseAdapter } from '../../../core/base.adapter';
import { BaseResponse } from '../../models/base-response';
import { AlertDirectory, AlertDirectoryApiData, mapAlertDirectoryRowDto } from './alert-directory.model';

@Injectable({ providedIn: 'root' })
export class AlertDirectoryAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<AlertDirectory>, BaseResponse<AlertDirectoryApiData>>
{
  fromApi(response: BaseResponse<AlertDirectoryApiData>): BaseResponse<AlertDirectory> {
    const data: AlertDirectory = {
      partnerEntries: (response?.data?.partner_entries ?? []).map(mapAlertDirectoryRowDto),
      pmEntries: (response?.data?.pm_entries ?? []).map(mapAlertDirectoryRowDto),
      isHubPermissionsEnabled: response?.data?.hub_permissions_enabled ?? false,
    };
    return new BaseResponse<AlertDirectory>(data, this.getError(response?.error));
  }
}
