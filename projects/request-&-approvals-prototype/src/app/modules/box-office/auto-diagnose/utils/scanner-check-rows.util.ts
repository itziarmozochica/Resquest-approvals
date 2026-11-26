import { SCANNER_CHECK_ORDER, ScannerCheckId, ScannerCheckOutcome, ScannerCheckResult } from '../models/scanner-diagnose.model';

const CHECK_KEY_PREFIX = 'boxOffice.autoDiagnose.scanner.checks.';

export interface ScannerCheckRow {
  detailKey: string | null;
  detailParams: Record<string, string>;
  id: ScannerCheckId;
  labelKey: string;
  outcome: ScannerCheckOutcome;
}

export function toScannerCheckRows(checks: readonly ScannerCheckResult[]): ScannerCheckRow[] {
  return SCANNER_CHECK_ORDER.map((id: ScannerCheckId) => checks.find((check: ScannerCheckResult) => check.id === id))
    .filter((check: ScannerCheckResult | undefined): check is ScannerCheckResult => check !== undefined)
    .map((check: ScannerCheckResult) => ({
      detailKey: toDetailKey(check),
      detailParams: { value: check.detail ?? '' },
      id: check.id,
      labelKey: `${CHECK_KEY_PREFIX}${check.id}.label`,
      outcome: check.outcome,
    }));
}

function toDetailKey(check: ScannerCheckResult): string | null {
  if (check.outcome === ScannerCheckOutcome.skipped) {
    return `${CHECK_KEY_PREFIX}skipped`;
  }
  if (check.id === ScannerCheckId.delivery) {
    return check.outcome === ScannerCheckOutcome.failed ? `${CHECK_KEY_PREFIX}delivery.${check.detail}` : null;
  }
  if (check.id === ScannerCheckId.responseTime) {
    return `${CHECK_KEY_PREFIX}responseTime.${check.outcome}`;
  }

  return check.outcome === ScannerCheckOutcome.failed ? `${CHECK_KEY_PREFIX}${check.id}.failed` : null;
}
