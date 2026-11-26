import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import {
  QueueMetric,
  QueueMetricData,
  QueueOverview,
  QueueOverviewConstraints,
  QueueOverviewConstraintsData,
  QueueOverviewData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/queue/queue-overview.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';

@Injectable({
  providedIn: 'root',
})
export class QueueOverviewAdapter implements AdapterInterface<QueueOverview, BaseResponse<QueueOverviewData>> {
  fromApi(response: BaseResponse<QueueOverviewData>): QueueOverview {
    const data = response.data;
    if (!data) {
      throw new Error('No data received from queue overview API');
    }
    return {
      constraints: data.constraints ? this.#mapConstraints(data.constraints) : null,
      metrics: (data.metrics ?? []).map(m => this.#mapMetric(m)),
      status: data.status ?? 'ok',
      waitingRoomId: data.waiting_room_id,
      warnings: data.warnings ?? [],
    };
  }

  #mapConstraints(c: QueueOverviewConstraintsData): QueueOverviewConstraints {
    return {
      globalHardMax: c.global_hard_max,
      globalMax: c.global_max,
      globalSoftMax: c.global_soft_max,
      isSeating: c.is_seating,
      nonSeatingHardMax: c.non_seating_hard_max,
      nonSeatingMax: c.non_seating_max,
      nonSeatingSoftMax: c.non_seating_soft_max,
      planCapacityPerTimeSlot: c.plan_capacity_per_time_slot ?? null,
      seatingHardMax: c.seating_hard_max,
      seatingMax: c.seating_max,
      seatingSoftMax: c.seating_soft_max,
    };
  }

  #mapMetric(m: QueueMetricData): QueueMetric {
    return {
      breakdown: m.breakdown ?? [],
      displayNameKey: m.display_name_key ?? null,
      key: m.key,
      numericValue: m.numeric_value ?? null,
      renderType: m.render_type ?? 'card',
      series: m.series ?? [],
      status: m.status ?? 'ok',
      unit: m.unit ?? null,
      updatedAt: m.updated_at ?? null,
      value: m.value ?? null,
    };
  }
}
