export interface OnsiteSetupSummary {
  readonly name: string;
  readonly placeId: number;
}

export interface PlaceSummary {
  readonly cityId: number;
  readonly name: string;
  readonly onsiteSetupIds: readonly string[];
  readonly countryIsoCode2?: string;
}

export interface OnsiteSetupsSummary {
  readonly onsiteSetupsById: Record<string, OnsiteSetupSummary>;
  readonly placesById: Record<string, PlaceSummary>;
}

export const EMPTY_ONSITE_SETUPS_SUMMARY: OnsiteSetupsSummary = {
  onsiteSetupsById: {},
  placesById: {},
};
