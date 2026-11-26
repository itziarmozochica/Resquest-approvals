export type FiscalCountryCode = 'HU' | 'PL';

export type FiscalMapperVariant = 'hungary' | 'poland';

export type FiscalTaxGroupResolution = 'hungary-tax-rate' | 'poland-tax-group';

export type FiscalPrinterStateSource = 'hungary-printer-state' | 'poland-printer-work';

export type FiscalDayFlowVariant = 'hungary' | 'poland';

export type FiscalReprintVariant = 'hungary' | 'poland' | 'france';

export interface FiscalCountryProfile {
  readonly countryCode: FiscalCountryCode;
  readonly dayFlow: FiscalDayFlowVariant;
  readonly mapper: FiscalMapperVariant;
  readonly printerStateSource: FiscalPrinterStateSource;
  readonly reprint: FiscalReprintVariant;
  readonly taxGroupResolution: FiscalTaxGroupResolution;
}

export const TIME_ZONE_BY_FISCAL_COUNTRY: Readonly<Record<FiscalCountryCode, string>> = {
  HU: 'Europe/Budapest',
  PL: 'Europe/Warsaw',
};
