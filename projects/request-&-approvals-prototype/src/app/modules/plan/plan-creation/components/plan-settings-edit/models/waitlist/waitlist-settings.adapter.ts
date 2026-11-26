import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import {
  WaitlistSettings,
  WaitlistSettingsData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/waitlist/waitlist-settings.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class WaitlistSettingsAdapter implements AdapterInterface<WaitlistSettings, BaseResponse<WaitlistSettingsData>> {
  fromApi(response: BaseResponse<WaitlistSettingsData>): WaitlistSettings {
    const data = response.data;
    if (!data) {
      throw new Error('No data received from waitlist settings API');
    }
    return {
      automaticRedirection: data.automatic_redirections,
      presaleClosesAt: data.presale_closes_at ? new Date(data.presale_closes_at) : null,
      targetPlanId: data.target_main_plan_id,
      waitlistClosesAt: data.waitlist_closes_at ? new Date(data.waitlist_closes_at) : null,
    };
  }

  toApi(model: WaitlistSettings): WaitlistSettingsData {
    return {
      target_main_plan_id: model.targetPlanId,
      automatic_redirections: model.automaticRedirection,
      presale_closes_at: model.presaleClosesAt ? model.presaleClosesAt.toISOString() : null,
      waitlist_closes_at: model.waitlistClosesAt ? model.waitlistClosesAt.toISOString() : null,
    };
  }
}
