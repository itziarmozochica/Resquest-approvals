export interface OnsiteSetupSummaryApi {
  onsite_setup_name: string;
  place_id: number;
}

export interface PlaceSummaryApi {
  city_id: number;
  name: string;
  country_iso_code_2?: string;
  onsite_setup_ids?: string[];
}

export interface OnsiteSetupsSummaryApi {
  onsite_setups_by_id: Record<string, OnsiteSetupSummaryApi>;
  places_by_id: Record<string, PlaceSummaryApi>;
}
