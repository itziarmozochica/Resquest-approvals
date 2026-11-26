export interface OnsiteSetupSummaryDTO {
  onsite_setup_name: string;
  place_id: number;
}

export interface PlaceSummaryDTO {
  name: string;
  city_id: number;
  country_iso_code_2?: string;
  onsite_setup_ids: string[];
}

export interface OnsiteSetupsSummaryDTO {
  onsite_setups_by_id: Record<string, OnsiteSetupSummaryDTO>;
  places_by_id: Record<string, PlaceSummaryDTO>;
}

export const EMPTY_ONSITE_SETUPS_SUMMARY: OnsiteSetupsSummaryDTO = {
  onsite_setups_by_id: {},
  places_by_id: {},
};

export function normalizeOnsiteSetupsSummary(data: Partial<OnsiteSetupsSummaryDTO> | null | undefined): OnsiteSetupsSummaryDTO {
  return {
    onsite_setups_by_id: data?.onsite_setups_by_id ?? {},
    places_by_id: data?.places_by_id ?? {},
  };
}
