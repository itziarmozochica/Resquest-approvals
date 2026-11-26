import type { RetailSetupType } from './retail-setup-type.model';

export type UsDollar = 'USD';
export type CanadianDollar = 'CAD';
export type BritishPound = 'GBP';
export type Euro = 'EUR';
export type AustralianDollar = 'AUD';
export type JapaneseYen = 'JPY';

export type RetailCurrencyCode = UsDollar | CanadianDollar | BritishPound | Euro | AustralianDollar | JapaneseYen;

export const retailCurrencyDictionary: Partial<Record<RetailSetupType, readonly RetailCurrencyCode[]>> = {
  odoo: [],
  onebox: [],
  shopify: [],
  square: ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'JPY'],
};

export function getRetailCurrencyOptions(
  dictionary: Partial<Record<RetailSetupType, readonly RetailCurrencyCode[]>>,
  type: string,
): readonly RetailCurrencyCode[] {
  return dictionary[type as RetailSetupType] ?? [];
}
