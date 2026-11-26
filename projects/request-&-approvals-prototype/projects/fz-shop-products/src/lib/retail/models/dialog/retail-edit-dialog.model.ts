import type { RetailCurrencyCode } from '../../../core/models/retail-currency.model';

export interface RetailEditDialogData {
  currencySelectOptions: readonly RetailCurrencyCode[];
  isAvailableUnitsTrackingEnabled: boolean;
  isSyncEnabled: boolean;
  overriddenExternalCurrency: string;
  retailName: string;
  retailSetupId: string;
}

export interface RetailEditDialogSaveResult {
  isAvailableUnitsTrackingEnabled: boolean;
  isSyncEnabled: boolean;
  overriddenExternalCurrency: string;
  retailName: string;
  retailSetupId: string;
  type: 'save';
}

export type RetailEditDialogResult = RetailEditDialogSaveResult | undefined;
