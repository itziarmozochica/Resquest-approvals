import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import { FiscalCountryCode, FiscalCountryProfile, FiscalDayFlowVariant, FiscalReprintVariant } from './models/fiscal-country-profile.model';

export const HUNGARY_COUNTRY_CODE = 'HU';
export const FRANCE_COUNTRY_CODE = 'FR';
export const POLAND_COUNTRY_CODE = 'PL';

const FISCAL_COUNTRY_PROFILES: Readonly<Record<FiscalCountryCode, FiscalCountryProfile>> = {
  [HUNGARY_COUNTRY_CODE]: {
    countryCode: HUNGARY_COUNTRY_CODE,
    dayFlow: 'hungary',
    mapper: 'hungary',
    printerStateSource: 'hungary-printer-state',
    reprint: 'hungary',
    taxGroupResolution: 'hungary-tax-rate',
  },
  [POLAND_COUNTRY_CODE]: {
    countryCode: POLAND_COUNTRY_CODE,
    dayFlow: 'poland',
    mapper: 'poland',
    printerStateSource: 'poland-printer-work',
    reprint: 'poland',
    taxGroupResolution: 'poland-tax-group',
  },
};

const FISCAL_RECEIPT_FEATURE_FLAG_BY_COUNTRY: Readonly<Record<FiscalCountryCode, FeatureFlags>> = {
  [HUNGARY_COUNTRY_CODE]: FeatureFlags.EFSTA_FISCAL_RECEIPT_HUNGARY,
  [POLAND_COUNTRY_CODE]: FeatureFlags.EFSTA_FISCAL_RECEIPT_POLAND,
};

export function normalizeCountryCode(countryCode: string | null | undefined): string | undefined {
  const normalizedCountryCode = (countryCode ?? '').trim().toUpperCase();
  return normalizedCountryCode.length > 0 ? normalizedCountryCode : undefined;
}

function isFiscalCountryCode(countryCode: string | undefined): countryCode is FiscalCountryCode {
  return countryCode !== undefined && Object.prototype.hasOwnProperty.call(FISCAL_COUNTRY_PROFILES, countryCode);
}

/**
 * `true` when the place is in a fiscal country but its receipt flag has not resolved yet.
 *
 * `isFeatureEnabled()` returns `null` until the Optimizely SDK initialises, and every caller here
 * folds that into "disabled". That is the right default for *enabling* a fiscal flow, but callers
 * deciding whether to skip a dialog need to tell "off" from "unknown" apart.
 */
export function isFiscalFlagUnresolved(optimizelyService: OptimizelyService, countryCode: string | undefined): boolean {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!isFiscalCountryCode(normalizedCountryCode)) {
    return false;
  }
  return optimizelyService.isFeatureEnabled(FISCAL_RECEIPT_FEATURE_FLAG_BY_COUNTRY[normalizedCountryCode]) === null;
}

export function resolveFiscalCountryProfile(
  optimizelyService: OptimizelyService,
  countryCode: string | undefined,
): FiscalCountryProfile | undefined {
  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (!isFiscalCountryCode(normalizedCountryCode)) {
    return undefined;
  }
  const isEnabled = optimizelyService.isFeatureEnabled(FISCAL_RECEIPT_FEATURE_FLAG_BY_COUNTRY[normalizedCountryCode]) === true;
  return isEnabled ? FISCAL_COUNTRY_PROFILES[normalizedCountryCode] : undefined;
}

export function resolveFiscalDayFlowVariant(
  optimizelyService: OptimizelyService,
  countryCode: string | undefined,
): FiscalDayFlowVariant | undefined {
  return resolveFiscalCountryProfile(optimizelyService, countryCode)?.dayFlow;
}

export function resolveFiscalReprintVariant(
  optimizelyService: OptimizelyService,
  countryCode: string | undefined,
): FiscalReprintVariant | undefined {
  if (normalizeCountryCode(countryCode) === FRANCE_COUNTRY_CODE) {
    return 'france';
  }
  return resolveFiscalCountryProfile(optimizelyService, countryCode)?.reprint;
}
