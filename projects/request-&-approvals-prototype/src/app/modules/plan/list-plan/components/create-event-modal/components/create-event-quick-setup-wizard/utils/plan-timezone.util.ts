import { PlanDetail } from '@fz-original/app/shared/models/plan/plan-detail.model';

export function planTimezoneOf(planDetail: Pick<PlanDetail, 'venues'> | null): string | null {
  return planDetail?.venues?.[0]?.timezone ?? null;
}
