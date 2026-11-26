import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { PlaceOption } from '@fz-original/app/shared/search-bar/models/place-option.model';

import { OnsiteSetupsSummaryDTO, PlaceSummaryDTO } from '../../shared/models/onsite-setups-summary.model';

export function getPlaceOptionsFromSummary(summary: OnsiteSetupsSummaryDTO): PlaceOption[] {
  return Object.entries(summary.places_by_id)
    .filter(([, place]) => place.onsite_setup_ids.length > 0)
    .map(([placeId, place]) => new PlaceOption(0, Number(placeId), place.name, place.city_id, '', ''))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getOnsiteSetupsFromSummary(summary: OnsiteSetupsSummaryDTO, placeId: number): SelectOption[] {
  const place = findPlaceSummary(summary, placeId);
  if (!place) {
    return [];
  }

  return place.onsite_setup_ids.map(setupId => ({
    id: setupId,
    title: summary.onsite_setups_by_id[setupId]?.onsite_setup_name ?? '',
  }));
}

export function findPlaceSummary(summary: OnsiteSetupsSummaryDTO, placeId: number): PlaceSummaryDTO | undefined {
  return summary.places_by_id[String(placeId)];
}

export function hasOnsiteSetups(summary: OnsiteSetupsSummaryDTO): boolean {
  return getPlaceOptionsFromSummary(summary).length > 0;
}
