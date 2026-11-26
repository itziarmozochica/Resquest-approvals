import type { PlanSaveContext } from '@fz-original/app/modules/plan/tracking/models/plan-tracking.model';

const planSaveContextByMode: Readonly<Record<'creation' | 'edit', PlanSaveContext>> = {
  creation: 'plan_creation',
  edit: 'standalone',
};

export function resolvePlanSaveContext(mode: 'creation' | 'edit'): PlanSaveContext {
  return planSaveContextByMode[mode];
}
