export interface OnsiteSetupCountryCodeSource {
  onsiteSetup?: { place?: { country_iso_code_2?: string } } | null;
  ossPlaceCountryCode?: string | null;
  storedOnsiteSetup?: { place?: { country_iso_code_2?: string } } | null;
}

/** Resolves the place country from in-memory setup first, then persisted OSS / onsite-setup config. */
export function resolveOnsiteSetupCountryCode(source: OnsiteSetupCountryCodeSource): string | undefined {
  return (
    source.onsiteSetup?.place?.country_iso_code_2 ??
    source.storedOnsiteSetup?.place?.country_iso_code_2 ??
    source.ossPlaceCountryCode ??
    undefined
  );
}

export function hasActiveCashierShift(sources: { activeShift: unknown; openedShiftFromStorage: unknown }): boolean {
  return sources.activeShift != null || sources.openedShiftFromStorage != null;
}
