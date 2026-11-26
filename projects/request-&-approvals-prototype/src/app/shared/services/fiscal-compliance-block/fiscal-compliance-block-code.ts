/** Partners error codes that block a Box Office sale, cancellation or reschedule for fiscal compliance, before any charge. */
export enum FiscalComplianceBlockCode {
  FiscalConfigurationRequired = 'FISCAL_CONFIGURATION_REQUIRED',
  PlanVenueFiscalCountryMismatch = 'PLAN_VENUE_FISCAL_COUNTRY_MISMATCH',
}

export interface FiscalComplianceBlockCopy {
  readonly messageKey: string;
  readonly titleKey: string;
}

/** The compliance modal copy for each blocking code. */
export const fiscalComplianceBlockCopies: Readonly<Record<FiscalComplianceBlockCode, FiscalComplianceBlockCopy>> = {
  [FiscalComplianceBlockCode.FiscalConfigurationRequired]: {
    messageKey: 'boxOffice.fiscal.configurationRequired.message',
    titleKey: 'boxOffice.fiscal.configurationRequired.title',
  },
  [FiscalComplianceBlockCode.PlanVenueFiscalCountryMismatch]: {
    messageKey: 'boxOffice.fiscal.countryMismatch.message',
    titleKey: 'boxOffice.fiscal.countryMismatch.title',
  },
};

const fiscalComplianceBlockCodes: readonly unknown[] = Object.values(FiscalComplianceBlockCode);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiscalComplianceBlockCode(value: unknown): value is FiscalComplianceBlockCode {
  return fiscalComplianceBlockCodes.includes(value);
}

function findCode(value: unknown, ancestors: readonly Record<string, unknown>[]): FiscalComplianceBlockCode | undefined {
  if (!isRecord(value) || ancestors.includes(value)) {
    return undefined;
  }
  const code = value['code'];
  if (isFiscalComplianceBlockCode(code)) {
    return code;
  }
  for (const nestedValue of Object.values(value)) {
    const nestedCode = findCode(nestedValue, [...ancestors, value]);
    if (nestedCode !== undefined) {
      return nestedCode;
    }
  }
  return undefined;
}

/**
 * The first blocking code found in an error, searched depth-first because it arrives in different
 * envelopes (raw API error, `BaseResponse`, `HttpErrorResponse`, or the prepare-wrapped error).
 */
export function findFiscalComplianceBlockCode(error: unknown): FiscalComplianceBlockCode | undefined {
  return findCode(error, []);
}
