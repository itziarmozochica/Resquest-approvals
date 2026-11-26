import type { OnsiteSetupOption, OnsiteSetupVenueOption } from '../models/onsite-setup-option.model';
import type { OnsiteSetupsSummary, OnsiteSetupSummary, PlaceSummary } from '../models/onsite-setups-summary.model';

export function findPlaceSummary(summary: OnsiteSetupsSummary, placeId: number): PlaceSummary | undefined {
  return summary.placesById[String(placeId)];
}

export function getOnsiteSetupOptionsFromSummary(summary: OnsiteSetupsSummary, placeId: number): OnsiteSetupOption[] {
  const place = findPlaceSummary(summary, placeId);
  if (!place) {
    return [];
  }

  return place.onsiteSetupIds.map(setupId => ({
    id: setupId,
    title: findOnsiteSetupSummary(summary, setupId)?.name ?? '',
  }));
}

export function getVenueOptionsFromSummary(summary: OnsiteSetupsSummary): OnsiteSetupVenueOption[] {
  return Object.entries(summary.placesById)
    .filter(([, place]) => place.onsiteSetupIds.length > 0)
    .map(([placeId, place]) => ({ cityId: place.cityId, id: Number(placeId), name: place.name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function hasOnsiteSetups(summary: OnsiteSetupsSummary): boolean {
  return getVenueOptionsFromSummary(summary).length > 0;
}

function findOnsiteSetupSummary(summary: OnsiteSetupsSummary, onsiteSetupId: string): OnsiteSetupSummary | undefined {
  return summary.onsiteSetupsById[onsiteSetupId];
}
