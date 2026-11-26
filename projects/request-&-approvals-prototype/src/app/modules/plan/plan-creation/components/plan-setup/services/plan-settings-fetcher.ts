import { PlanType } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { Observable } from 'rxjs';

export interface PlanSettingsFetcher<TPlanTypeSettings = unknown> {
  fetchSettings(partnerId: number, planId: number): Observable<TPlanTypeSettings>;

  readonly planType: PlanType;
}
