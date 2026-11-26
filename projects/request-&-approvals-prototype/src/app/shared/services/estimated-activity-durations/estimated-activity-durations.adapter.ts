import { Injectable } from '@angular/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import {
  ActivityDurationEstimate,
  ActivityDurationEstimateData,
  EstimatedActivityDurationsData,
  PlanActivityDurations,
  WorstCaseDuration,
  WorstCaseDurationKind,
} from '../../models/estimated-activity-durations/plan-activity-durations.model';

export interface EstimatedActivityDurationsResponse {
  data?: EstimatedActivityDurationsData | null;
}

@Injectable({
  providedIn: 'root',
})
export class EstimatedActivityDurationsAdapter
  implements AdapterInterface<PlanActivityDurations | null, EstimatedActivityDurationsResponse>
{
  fromApi(response: EstimatedActivityDurationsResponse): PlanActivityDurations | null {
    const data = response?.data;
    if (!data) {
      return null;
    }
    return new PlanActivityDurations(this.#groupIdBySessionTypeId(data), this.#estimateByGroupId(data), this.#worstCaseByGroupId(data));
  }

  #estimateByGroupId(data: EstimatedActivityDurationsData): Map<number, ActivityDurationEstimate> {
    const estimateByGroupId = new Map<number, ActivityDurationEstimate>();
    Object.entries(data.session_type_groups ?? {}).forEach(([groupId, estimate]: [string, ActivityDurationEstimateData]) => {
      if (!this.#isUsable(estimate)) {
        return;
      }
      estimateByGroupId.set(
        Number(groupId),
        new ActivityDurationEstimate(
          estimate.floor_minutes,
          estimate.base_min_minutes,
          estimate.base_max_minutes,
          estimate.per_person_minutes,
          this.#perPersonCapOf(estimate),
        ),
      );
    });
    return estimateByGroupId;
  }

  #groupIdBySessionTypeId(data: EstimatedActivityDurationsData): Map<number, number> {
    const groupIdBySessionTypeId = new Map<number, number>();
    Object.entries(data.group_id_by_session_type_id ?? {}).forEach(([sessionTypeId, groupId]: [string, number]) => {
      groupIdBySessionTypeId.set(Number(sessionTypeId), groupId);
    });
    return groupIdBySessionTypeId;
  }

  #isUsable(estimate: ActivityDurationEstimateData): boolean {
    const minutes = [estimate.floor_minutes, estimate.base_min_minutes, estimate.base_max_minutes, estimate.per_person_minutes];
    return minutes.every((value: number) => Number.isFinite(value) && value >= 0) && estimate.base_min_minutes <= estimate.base_max_minutes;
  }

  // An absent, null or malformed cap leaves the per person term unclamped, which never shortens the estimate.
  #perPersonCapOf(estimate: ActivityDurationEstimateData): number | null {
    const perPersonCapPeople = estimate.per_person_cap_people;
    return typeof perPersonCapPeople === 'number' && Number.isInteger(perPersonCapPeople) && perPersonCapPeople > 0
      ? perPersonCapPeople
      : null;
  }

  #worstCaseByGroupId(data: EstimatedActivityDurationsData): Map<number, WorstCaseDuration> {
    const worstCaseByGroupId = new Map<number, WorstCaseDuration>();
    Object.entries(data.session_type_groups ?? {}).forEach(([groupId, estimate]: [string, ActivityDurationEstimateData]) => {
      worstCaseByGroupId.set(Number(groupId), this.#worstCaseOf(estimate));
    });
    return worstCaseByGroupId;
  }

  #worstCaseOf(estimate: ActivityDurationEstimateData): WorstCaseDuration {
    const worstCaseMinutes = estimate.worst_case_minutes;
    if (worstCaseMinutes === undefined) {
      return { kind: WorstCaseDurationKind.NotExposed };
    }
    if (worstCaseMinutes === null) {
      return { kind: WorstCaseDurationKind.MissingAssets };
    }
    if (Number.isInteger(worstCaseMinutes) && worstCaseMinutes > 0) {
      return { kind: WorstCaseDurationKind.Minutes, minutes: worstCaseMinutes };
    }
    return { kind: WorstCaseDurationKind.Unknown };
  }
}
