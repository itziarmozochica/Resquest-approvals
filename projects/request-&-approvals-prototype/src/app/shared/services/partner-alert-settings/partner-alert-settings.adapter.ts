import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { BaseAdapter } from '../../../core/base.adapter';
import { BaseResponse } from '../../models/base-response';
import { mapPartnerAlertSettingsDto, PartnerAlertSettings, PartnerAlertSettingsApiDto } from './partner-alert-settings.model';

@Injectable({ providedIn: 'root' })
export class PartnerAlertSettingsAdapter
  extends BaseAdapter
  implements AdapterInterface<BaseResponse<PartnerAlertSettings | null>, BaseResponse<PartnerAlertSettingsApiDto | null>>
{
  fromApi(response: BaseResponse<PartnerAlertSettingsApiDto | null>): BaseResponse<PartnerAlertSettings | null> {
    const dto = response?.data ?? null;
    const data = dto ? mapPartnerAlertSettingsDto(dto) : null;
    return new BaseResponse<PartnerAlertSettings | null>(data, this.getError(response?.error));
  }
}
