import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import {
  PrizeDrawSettings,
  PrizeDrawSettingsData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/prize-draw/prize-draw-settings.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class PrizeDrawSettingsAdapter implements AdapterInterface<PrizeDrawSettings, BaseResponse<PrizeDrawSettingsData>> {
  fromApi(response: BaseResponse<PrizeDrawSettingsData>): PrizeDrawSettings {
    const data = response.data;
    return {
      drawEndsAt: data?.draw_ends_at ? new Date(data.draw_ends_at) : null,
      drawStartsAt: data?.draw_starts_at ? new Date(data.draw_starts_at) : null,
      eventEndsAt: data?.event_ends_at ? new Date(data.event_ends_at) : null,
      eventStartsAt: data?.event_starts_at ? new Date(data.event_starts_at) : null,
      pointsAmountPerParticipation: data?.points_amount_per_participation ?? 0,
      status: data?.status ?? null,
    };
  }

  toApi(model: PrizeDrawSettings): PrizeDrawSettingsData {
    return {
      draw_ends_at: model.drawEndsAt != null ? model.drawEndsAt.toISOString() : null,
      draw_starts_at: model.drawStartsAt != null ? model.drawStartsAt.toISOString() : null,
      event_ends_at: model.eventEndsAt != null ? model.eventEndsAt.toISOString() : null,
      event_starts_at: model.eventStartsAt != null ? model.eventStartsAt.toISOString() : null,
      points_amount_per_participation: model.pointsAmountPerParticipation,
    };
  }
}
