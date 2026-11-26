import { DiagnoseStatus } from '../models/auto-diagnose.model';
import {
  SCANNER_DUPLICATE_WINDOW_MS,
  SCANNER_FIX_GUIDE_CHECKS,
  SCANNER_MAX_RESPONSE_MS,
  ScannerCheckId,
  ScannerCheckOutcome,
  ScannerCheckResult,
  ScannerConnectionAdvice,
  ScannerDeliveryFailure,
  ScannerDiagnosis,
  ScannerInputEvent,
  ScannerInputSource,
  ScannerStepRecord,
  ScannerTestStep,
} from '../models/scanner-diagnose.model';

const trailingLineBreaks = /[\r\n]+$/;
const lineBreakAtEnd = /[\r\n]$/;
const LAST_CONTROL_CODE = 0x1f;
const DELETE_CODE = 0x7f;

export function diagnoseScanner(records: readonly ScannerStepRecord[]): ScannerDiagnosis {
  const events: ScannerInputEvent[] = records.flatMap((record: ScannerStepRecord) => record.events);
  const scans: ScannerInputEvent[] = events.filter(isBroadcast);
  const keys: ScannerInputEvent[] = events.filter((event: ScannerInputEvent) => !isBroadcast(event));
  const firstScan: ScannerInputEvent | undefined = scans[0];

  return {
    checks: [
      checkDelivery(scans, keys),
      checkBroadcastOnly(scans, keys),
      checkPayload(records),
      checkNoDuplicates(records),
      checkResponseTime(records),
    ],
    endsWithEnter: firstScan === undefined ? null : lineBreakAtEnd.test(firstScan.value),
    receivedSample: firstScan === undefined ? null : toVisibleText(firstScan.value),
  };
}

export function isScannerConnected(diagnosis: ScannerDiagnosis): boolean {
  return diagnosis.checks.some(
    (check: ScannerCheckResult) => check.id === ScannerCheckId.delivery && check.outcome === ScannerCheckOutcome.ok,
  );
}

export function toConnectionAdvice(failures: number): ScannerConnectionAdvice | null {
  if (failures <= 0) {
    return null;
  }
  if (failures === 1) {
    return ScannerConnectionAdvice.checkCable;
  }

  return failures === 2 ? ScannerConnectionAdvice.replug : ScannerConnectionAdvice.contactSupport;
}

export function needsSuffixFix(diagnosis: ScannerDiagnosis): boolean {
  return diagnosis.checks.some(
    (check: ScannerCheckResult) => SCANNER_FIX_GUIDE_CHECKS.includes(check.id) && check.outcome === ScannerCheckOutcome.failed,
  );
}

export function needsBroadcastFix(diagnosis: ScannerDiagnosis): boolean {
  return diagnosis.checks.some(
    (check: ScannerCheckResult) =>
      (check.id === ScannerCheckId.broadcastOnly && check.outcome === ScannerCheckOutcome.failed) ||
      (check.id === ScannerCheckId.delivery && check.detail === ScannerDeliveryFailure.keyboardOnly),
  );
}

export function toScannerStatus(diagnosis: ScannerDiagnosis | null): DiagnoseStatus {
  if (diagnosis === null) {
    return DiagnoseStatus.notTested;
  }
  if (!isScannerConnected(diagnosis)) {
    return DiagnoseStatus.failed;
  }

  return diagnosis.checks.some((check: ScannerCheckResult) => check.outcome === ScannerCheckOutcome.failed)
    ? DiagnoseStatus.warning
    : DiagnoseStatus.ok;
}

export function toVisibleText(raw: string): string {
  return [...raw].map(toVisibleCharacter).join('');
}

export function normalizeScan(raw: string): string {
  return raw.replace(trailingLineBreaks, '');
}

function checkBroadcastOnly(scans: ScannerInputEvent[], keys: ScannerInputEvent[]): ScannerCheckResult {
  if (scans.length === 0 && keys.length === 0) {
    return result(ScannerCheckId.broadcastOnly, ScannerCheckOutcome.skipped);
  }

  return keys.length > 0
    ? result(ScannerCheckId.broadcastOnly, ScannerCheckOutcome.failed, String(keys.length))
    : result(ScannerCheckId.broadcastOnly, ScannerCheckOutcome.ok);
}

function checkDelivery(scans: ScannerInputEvent[], keys: ScannerInputEvent[]): ScannerCheckResult {
  if (scans.length > 0) {
    return result(ScannerCheckId.delivery, ScannerCheckOutcome.ok);
  }

  return result(
    ScannerCheckId.delivery,
    ScannerCheckOutcome.failed,
    keys.length > 0 ? ScannerDeliveryFailure.keyboardOnly : ScannerDeliveryFailure.nothingReceived,
  );
}

function checkNoDuplicates(records: readonly ScannerStepRecord[]): ScannerCheckResult {
  const singleScanRecords: ScannerStepRecord[] = records.filter((record: ScannerStepRecord) => record.step !== ScannerTestStep.speed);
  const scansPerRecord: ScannerInputEvent[][] = singleScanRecords.map((record: ScannerStepRecord) => record.events.filter(isBroadcast));

  if (scansPerRecord.every((scans: ScannerInputEvent[]) => scans.length === 0)) {
    return result(ScannerCheckId.noDuplicates, ScannerCheckOutcome.skipped);
  }

  const hasDuplicate: boolean = scansPerRecord.some((scans: ScannerInputEvent[]) =>
    scans.some(
      (scan: ScannerInputEvent, index: number) =>
        index > 0 && scan.value === scans[index - 1].value && scan.at - scans[index - 1].at < SCANNER_DUPLICATE_WINDOW_MS,
    ),
  );

  return result(ScannerCheckId.noDuplicates, hasDuplicate ? ScannerCheckOutcome.failed : ScannerCheckOutcome.ok);
}

function checkPayload(records: readonly ScannerStepRecord[]): ScannerCheckResult {
  const mismatch: ScannerInputEvent | undefined = records
    .flatMap((record: ScannerStepRecord) =>
      record.events.filter((event: ScannerInputEvent) => isBroadcast(event) && normalizeScan(event.value) !== record.expected),
    )
    .at(0);
  const hasScans: boolean = records.some((record: ScannerStepRecord) => record.events.some(isBroadcast));

  if (!hasScans) {
    return result(ScannerCheckId.payload, ScannerCheckOutcome.skipped);
  }

  return mismatch === undefined
    ? result(ScannerCheckId.payload, ScannerCheckOutcome.ok)
    : result(ScannerCheckId.payload, ScannerCheckOutcome.failed, toVisibleText(mismatch.value));
}

function checkResponseTime(records: readonly ScannerStepRecord[]): ScannerCheckResult {
  const delays: number[] = [...records.map(keyToScanDelay), speedStepInterval(records)].filter(
    (delay: number | null): delay is number => delay !== null,
  );

  if (delays.length === 0) {
    return result(ScannerCheckId.responseTime, ScannerCheckOutcome.skipped);
  }

  const slowest: number = Math.max(...delays);

  return slowest >= SCANNER_MAX_RESPONSE_MS
    ? result(ScannerCheckId.responseTime, ScannerCheckOutcome.failed, String(Math.round(slowest)))
    : result(ScannerCheckId.responseTime, ScannerCheckOutcome.ok, String(Math.round(slowest)));
}

function isBroadcast(event: ScannerInputEvent): boolean {
  return event.source === ScannerInputSource.broadcast;
}

function keyToScanDelay(record: ScannerStepRecord): number | null {
  const firstKey: ScannerInputEvent | undefined = record.events.find((event: ScannerInputEvent) => !isBroadcast(event));
  const firstScan: ScannerInputEvent | undefined = record.events.find(isBroadcast);

  return firstKey === undefined || firstScan === undefined || firstScan.at < firstKey.at ? null : firstScan.at - firstKey.at;
}

function result(id: ScannerCheckId, outcome: ScannerCheckOutcome, detail: string | null = null): ScannerCheckResult {
  return { detail, id, outcome };
}

/** The quickest gap between consecutive scans: a scanner that holds every scan ~3 s can never go below it. */
function speedStepInterval(records: readonly ScannerStepRecord[]): number | null {
  const scans: ScannerInputEvent[] =
    records.find((record: ScannerStepRecord) => record.step === ScannerTestStep.speed)?.events.filter(isBroadcast) ?? [];

  if (scans.length < 2) {
    return null;
  }

  return Math.min(...scans.slice(1).map((scan: ScannerInputEvent, index: number) => scan.at - scans[index].at));
}

function toVisibleCharacter(character: string): string {
  const code: number = character.charCodeAt(0);

  if (code > LAST_CONTROL_CODE && code !== DELETE_CODE) {
    return character;
  }

  switch (character) {
    case '\r':
      return '\\r';
    case '\n':
      return '\\n';
    case '\t':
      return '\\t';
    default:
      return `\\x${code.toString(16).padStart(2, '0')}`;
  }
}
