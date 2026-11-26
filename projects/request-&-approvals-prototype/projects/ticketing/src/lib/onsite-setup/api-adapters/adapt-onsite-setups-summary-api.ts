import type { OnsiteSetupsSummaryApi } from '../models/api/onsite-setups-summary.api';
import type { OnsiteSetupsSummary, OnsiteSetupSummary, PlaceSummary } from '../models/onsite-setups-summary.model';

export function adaptOnsiteSetupsSummaryApi(data: Partial<OnsiteSetupsSummaryApi> | null | undefined): OnsiteSetupsSummary {
  const onsiteSetupsById = Object.entries(data?.onsite_setups_by_id ?? {}).reduce<Record<string, OnsiteSetupSummary>>(
    (accumulator, [setupId, setup]) => {
      accumulator[setupId] = { name: setup.onsite_setup_name, placeId: setup.place_id };

      return accumulator;
    },
    {},
  );

  const placesById = Object.entries(data?.places_by_id ?? {}).reduce<Record<string, PlaceSummary>>((accumulator, [placeId, place]) => {
    accumulator[placeId] = {
      cityId: place.city_id,
      countryIsoCode2: place.country_iso_code_2,
      name: place.name,
      onsiteSetupIds: place.onsite_setup_ids ?? [],
    };

    return accumulator;
  }, {});

  return { onsiteSetupsById, placesById };
}
