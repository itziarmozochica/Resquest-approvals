import { EfrHealthErrorCode } from './models/efr-health-check.model';
import { EfrPrinterState } from './models/efr-printer-state.model';
import { EfrHealthPolicy, EfrHealthRule, EfrReadableField } from './models/efr-state-readout.model';
import { FiscalPrinterStateSource, TIME_ZONE_BY_FISCAL_COUNTRY } from './models/fiscal-country-profile.model';

const PRINTER_OFFLINE_WARNING = 'Printer:offline';
const Z_REQUIRED_WARNING = 'Z:required';
const DEVICE_FAULT_SIGNALS: readonly EfrReadableField[] = ['coverOpen', 'paperEnd', 'printerWork'];

export function hasWarning(state: EfrPrinterState, code: string): boolean {
  return state.warnings?.includes(code) === true;
}

export function isZRequiredToday(nextZRequired: string | null, timeZone: string): boolean {
  if (nextZRequired == null) {
    return false;
  }
  const requiredDate = new Date(nextZRequired);
  if (isNaN(requiredDate.getTime())) {
    return false;
  }
  return nextZRequired.slice(0, 10) <= new Date().toLocaleDateString('sv', { timeZone });
}

const HUNGARY_HEALTH_POLICY: EfrHealthPolicy = {
  rules: [
    {
      code: EfrHealthErrorCode.PRINTER_OFFLINE,
      isTriggered: (state: EfrPrinterState) => hasWarning(state, PRINTER_OFFLINE_WARNING) && state.printerWork !== true,
      reads: ['printerWork', 'warnings'],
    },
    {
      code: EfrHealthErrorCode.COVER_OPEN,
      isTriggered: (state: EfrPrinterState) => state.printerWork !== true && state.coverOpen === true,
      reads: ['coverOpen', 'printerWork'],
    },
    {
      code: EfrHealthErrorCode.PAPER_END,
      isTriggered: (state: EfrPrinterState) => state.printerWork !== true && state.paperEnd === true,
      reads: ['paperEnd', 'printerWork'],
    },
    {
      code: EfrHealthErrorCode.Z_REQUIRED,
      isTriggered: (state: EfrPrinterState) =>
        hasWarning(state, Z_REQUIRED_WARNING) || isZRequiredToday(state.nextZRequired, TIME_ZONE_BY_FISCAL_COUNTRY.HU),
      reads: ['nextZRequired', 'warnings'],
    },
    {
      code: EfrHealthErrorCode.FISCAL_DAY_NOT_OPEN,
      isTriggered: (state: EfrPrinterState) => state.dayOpen !== true,
      reads: ['dayOpen'],
    },
  ],
  source: 'hungary-printer-state',
};

const POLAND_HEALTH_POLICY: EfrHealthPolicy = {
  rules: [
    {
      code: EfrHealthErrorCode.COVER_OPEN,
      isTriggered: (state: EfrPrinterState) => state.coverOpen === true,
      reads: ['coverOpen'],
    },
    {
      code: EfrHealthErrorCode.PAPER_END,
      isTriggered: (state: EfrPrinterState) => state.paperEnd === true,
      reads: ['paperEnd'],
    },
    {
      code: EfrHealthErrorCode.PRINTER_OFFLINE,
      isTriggered: (state: EfrPrinterState) => state.printerWork === false,
      reads: ['printerWork'],
    },
  ],
  source: 'poland-printer-work',
};

export const EFR_HEALTH_POLICY_BY_SOURCE: Readonly<Record<FiscalPrinterStateSource, EfrHealthPolicy>> = {
  'hungary-printer-state': HUNGARY_HEALTH_POLICY,
  'poland-printer-work': POLAND_HEALTH_POLICY,
};

export function resolveEfrHealthPolicy(source: FiscalPrinterStateSource): EfrHealthPolicy {
  return EFR_HEALTH_POLICY_BY_SOURCE[source];
}

export function detectPolicyError(
  policy: EfrHealthPolicy,
  state: EfrPrinterState,
  excludeErrors: readonly EfrHealthErrorCode[],
): EfrHealthErrorCode | null {
  for (const rule of policy.rules) {
    if (rule.isTriggered(state) && !excludeErrors.includes(rule.code)) {
      return rule.code;
    }
  }
  return null;
}

export function isSignalGoverned(policy: EfrHealthPolicy, signal: EfrReadableField): boolean {
  return policy.rules.some((rule: EfrHealthRule) => rule.reads.includes(signal));
}

export function describeDeviceFaults(policy: EfrHealthPolicy, state: EfrPrinterState): readonly EfrReadableField[] {
  return DEVICE_FAULT_SIGNALS.filter(signal => isSignalGoverned(policy, signal) && isDeviceFaultSignalActive(signal, state));
}

export function isAnySignalExplainedByATriggeredRule(
  policy: EfrHealthPolicy,
  state: EfrPrinterState,
  signals: readonly EfrReadableField[],
): boolean {
  return policy.rules.some((rule: EfrHealthRule) => rule.isTriggered(state) && rule.reads.some(read => signals.includes(read)));
}

function isDeviceFaultSignalActive(signal: EfrReadableField, state: EfrPrinterState): boolean {
  switch (signal) {
    case 'coverOpen':
      return state.coverOpen === true;
    case 'paperEnd':
      return state.paperEnd === true;
    case 'printerWork':
      return state.printerWork !== true;
    default:
      return false;
  }
}
