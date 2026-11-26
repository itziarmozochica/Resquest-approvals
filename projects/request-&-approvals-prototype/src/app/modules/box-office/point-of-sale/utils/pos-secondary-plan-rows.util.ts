import type { BundleInformation, Plan, SecondaryPlanInformation } from '@fz-original/app/shared/models/plan/plan.model';

export type SecondaryPlansSource = Pick<Plan, 'bundleInformation' | 'id' | 'secondaryPlansInformation'>;

export function selectableSecondaryPlans(activePlan: SecondaryPlansSource | null): readonly SecondaryPlanInformation[] {
  const informationById = new Map((activePlan?.secondaryPlansInformation ?? []).map(information => [information.id, information]));
  const seenPlanIds = new Set<number>();

  return (activePlan?.bundleInformation?.bundles ?? []).flatMap(bundle => {
    const information = informationById.get(bundle.planId);
    if (!bundle.isAvailable || bundle.planId === activePlan?.id || seenPlanIds.has(bundle.planId) || information === undefined) {
      return [];
    }
    seenPlanIds.add(bundle.planId);
    return [information];
  });
}

export function maxSecondaryPlanSelections(bundleInformation: BundleInformation | null, selectablePlanCount: number): number {
  const maxSize = bundleInformation?.maxSize;

  return maxSize == null ? selectablePlanCount : Math.max(maxSize - 1, 0);
}
