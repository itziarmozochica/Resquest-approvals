import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import { POLAND_COUNTRY_CODE, resolveFiscalCountryProfile } from './fiscal-country-profile.util';

export const EFR_PL_ZERO_VALUE_TRANSACTION_LOG_CODE = 'EFR_PL_ZERO_VALUE_TRANSACTION';

export function isZeroFiscalAmount(amount: number | null | undefined): boolean {
  return amount != null && Number(amount) === 0;
}

export function isPolishFiscalReceiptEnabled(optimizelyService: OptimizelyService, countryCode: string | undefined): boolean {
  return resolveFiscalCountryProfile(optimizelyService, countryCode)?.countryCode === POLAND_COUNTRY_CODE;
}

export function isPolishZeroValueTransaction(
  optimizelyService: OptimizelyService,
  countryCode: string | undefined,
  amount: number | null | undefined,
): boolean {
  return isPolishFiscalReceiptEnabled(optimizelyService, countryCode) && isZeroFiscalAmount(amount);
}
