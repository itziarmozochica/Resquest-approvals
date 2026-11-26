import { Plan } from '@fz-original/app/shared/models/plan/plan.model';

import { OSSPlanConfig } from '../../models/oss-config.model';
import type { PosPlaceEventSelectorModalClosedData } from '../events/pos-place-event-selector-modal-closed.event';

function isSamePlanPlaceConfig(previousPlanConfig: OSSPlanConfig | null, selectedPlanConfig: OSSPlanConfig): boolean {
  if (!previousPlanConfig) {
    return false;
  }

  return previousPlanConfig.id === selectedPlanConfig.id && previousPlanConfig.placeId === selectedPlanConfig.placeId;
}

function resolvePlanPlaceEventLabels(
  config: OSSPlanConfig | null | undefined,
  availablePlans: Plan[],
): { event: string | null; place: string | null } {
  if (!config?.id || !config.placeId) {
    return { event: null, place: null };
  }

  const planId = parseInt(config.id, 10);
  const placeId = parseInt(config.placeId, 10);
  if (Number.isNaN(planId) || Number.isNaN(placeId)) {
    return { event: null, place: null };
  }

  const plan = availablePlans.find(availablePlan => availablePlan.id === planId);
  const place = plan?.places?.find(availablePlace => availablePlace.id === placeId);

  return {
    event: plan?.name ?? null,
    place: place?.name ?? null,
  };
}

export function buildPlanPlaceSelectorChangeData(
  previousPlanConfig: OSSPlanConfig | null,
  selectedPlanConfig: OSSPlanConfig | null | undefined,
  availablePlans: Plan[],
): PosPlaceEventSelectorModalClosedData | null {
  if (!selectedPlanConfig || isSamePlanPlaceConfig(previousPlanConfig, selectedPlanConfig)) {
    return null;
  }

  const fromLabels = resolvePlanPlaceEventLabels(previousPlanConfig, availablePlans);
  const toLabels = resolvePlanPlaceEventLabels(selectedPlanConfig, availablePlans);

  return {
    fromEvent: fromLabels.event,
    fromPlace: fromLabels.place,
    toEvent: toLabels.event,
    toPlace: toLabels.place,
  };
}
