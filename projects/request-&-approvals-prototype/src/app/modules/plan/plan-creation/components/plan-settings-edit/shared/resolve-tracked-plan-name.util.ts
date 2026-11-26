import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

export function resolveTrackedPlanName(planId: number, selectedPlan: SelectOption | undefined, loadedPlanName: string): string {
  return selectedPlan?.id === planId ? selectedPlan.title : loadedPlanName;
}
