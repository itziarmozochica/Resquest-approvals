import {
  SessionType,
  SessionTypeBulkEditProperty,
  SessionTypeBulkEditPropertyValue,
} from '@fz-original/app/shared/services/sessions/session-type.model';

import {
  CrossEventBulkEditEditPropertiesStepCompletedData,
  CrossEventBulkEditSelectEventsStepCompletedData,
  CrossEventBulkEditSelectProductsStepCompletedData,
} from '../../tracking/events/cross-event-bulk-edit-step-completed.event';
import {
  CrossEventBulkEditTrackedProperty,
  CrossEventBulkEditTrackingStep,
} from '../../tracking/models/cross-event-bulk-edit-tracking.model';

const trackedPropertyNames: Partial<Record<SessionTypeBulkEditPropertyValue, string>> = {
  [SessionTypeBulkEditProperty.allowedNumTickets]: CrossEventBulkEditTrackedProperty.allowedNumTickets,
  [SessionTypeBulkEditProperty.details]: CrossEventBulkEditTrackedProperty.details,
  [SessionTypeBulkEditProperty.instructions]: CrossEventBulkEditTrackedProperty.instructions,
  [SessionTypeBulkEditProperty.label]: CrossEventBulkEditTrackedProperty.label,
  [SessionTypeBulkEditProperty.productType]: CrossEventBulkEditTrackedProperty.productType,
  [SessionTypeBulkEditProperty.selectionRule]: CrossEventBulkEditTrackedProperty.selectionRule,
};

export function toSelectEventsStepCompletedData(input: {
  planOnSale: Readonly<Record<number, boolean>>;
  planPlaceIds: Readonly<Record<number, number | null>>;
  selectedPlanIds: readonly number[];
  usedSelectAll: boolean;
}): CrossEventBulkEditSelectEventsStepCompletedData {
  const venues = new Set<number>();
  let onSaleEventsCount = 0;
  for (const planId of input.selectedPlanIds) {
    if (input.planOnSale[planId] === true) {
      onSaleEventsCount += 1;
    }

    const placeId = input.planPlaceIds[planId];
    if (placeId !== undefined && placeId !== null) {
      venues.add(placeId);
    }
  }

  return {
    eventsCount: input.selectedPlanIds.length,
    onSaleEventsCount,
    step: CrossEventBulkEditTrackingStep.selectEvents,
    usedSelectAll: input.usedSelectAll,
    venuesCount: venues.size,
  };
}

export function toSelectProductsStepCompletedData(
  selectedTicketTypeIds: readonly number[],
  sessionTypes: readonly SessionType[],
): CrossEventBulkEditSelectProductsStepCompletedData {
  const selected = new Set(selectedTicketTypeIds);
  const products = new Set<string>();
  const groups = new Set<string>();
  for (const sessionType of sessionTypes) {
    if (!selected.has(sessionType.id)) {
      continue;
    }

    const groupName = sessionType.groups[0]?.name ?? '';
    groups.add(groupName);
    products.add(`${groupName}\u0000${sessionType.label}`);
  }

  return {
    productGroupsCount: groups.size,
    productsCount: products.size,
    spellingSuggestionsAccepted: 0,
    step: CrossEventBulkEditTrackingStep.selectProducts,
  };
}

export function toEditPropertiesStepCompletedData(
  selectedProperties: readonly SessionTypeBulkEditPropertyValue[],
): CrossEventBulkEditEditPropertiesStepCompletedData {
  const properties = selectedProperties
    .map(property => trackedPropertyNames[property])
    .filter((name): name is string => name !== undefined);

  return {
    properties,
    propertiesCount: properties.length,
    step: CrossEventBulkEditTrackingStep.editProperties,
  };
}
