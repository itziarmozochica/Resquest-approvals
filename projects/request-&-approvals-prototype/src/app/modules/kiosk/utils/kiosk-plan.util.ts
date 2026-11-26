import { KioskPlanDetail } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';

export function isKioskRealTimePlan(plan: KioskPlanDetail | null, planId?: string | number): boolean {
  if (plan === null || plan.presentation_settings?.is_real_time !== true) {
    return false;
  }

  if (planId === undefined) {
    return true;
  }

  const planIdNumber = typeof planId === 'string' ? Number(planId) : planId;

  return plan.id === planIdNumber;
}
