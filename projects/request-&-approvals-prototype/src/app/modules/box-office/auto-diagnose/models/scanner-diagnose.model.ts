import { Code128Fnc3 } from './code128.model';

export enum ScannerInputSource {
  broadcast = 'broadcast',
  keyboard = 'keyboard',
}

export interface ScannerInputEvent {
  at: number;
  source: ScannerInputSource;
  value: string;
}

export enum ScannerTestStep {
  barcode = 'barcode',
  brand = 'brand',
  done = 'done',
  qr = 'qr',
  speed = 'speed',
}

export interface ScannerStepRecord {
  events: ScannerInputEvent[];
  expected: string;
  step: ScannerTestStep;
}

export enum ScannerCheckId {
  broadcastOnly = 'broadcastOnly',
  delivery = 'delivery',
  noDuplicates = 'noDuplicates',
  payload = 'payload',
  responseTime = 'responseTime',
}

export enum ScannerDeliveryFailure {
  keyboardOnly = 'keyboardOnly',
  nothingReceived = 'nothingReceived',
}

export enum ScannerCheckOutcome {
  failed = 'failed',
  ok = 'ok',
  skipped = 'skipped',
}

export interface ScannerCheckResult {
  detail: string | null;
  id: ScannerCheckId;
  outcome: ScannerCheckOutcome;
}

export interface ScannerDiagnosis {
  checks: ScannerCheckResult[];
  endsWithEnter: boolean | null;
  receivedSample: string | null;
}

export const SCANNER_CHECK_ORDER: readonly ScannerCheckId[] = [
  ScannerCheckId.delivery,
  ScannerCheckId.broadcastOnly,
  ScannerCheckId.payload,
  ScannerCheckId.noDuplicates,
  ScannerCheckId.responseTime,
];

export const SCANNER_FIX_GUIDE_CHECKS: readonly ScannerCheckId[] = [ScannerCheckId.payload, ScannerCheckId.responseTime];

export const SCANNER_TEST_STEPS: readonly ScannerTestStep[] = [
  ScannerTestStep.brand,
  ScannerTestStep.qr,
  ScannerTestStep.barcode,
  ScannerTestStep.speed,
  ScannerTestStep.done,
];

export enum ScannerConnectionAdvice {
  checkCable = 'checkCable',
  contactSupport = 'contactSupport',
  replug = 'replug',
}

export const SCANNER_MAX_RESPONSE_MS = 2_000;
export const SCANNER_STEP_SETTLE_MS = 600;
export const SCANNER_TEST_QR_SIZE_PX = 240;
export const SCANNER_DUPLICATE_WINDOW_MS = 500;
export const SCANNER_SPEED_SCANS = 3;
export const SCANNER_NO_SCAN_HINT_MS = 10_000;
export const SCANNER_TEST_CODE_PREFIX = 'FZDIAG-';

export interface ScannerProgrammingCode {
  fnc3: Code128Fnc3;
  value: string;
}

export const HONEYWELL_ADD_CR_SUFFIX_COMMAND: ScannerProgrammingCode = { fnc3: Code128Fnc3.leading, value: 'SUFBK2990D.' };
export const ZEBRA_ADD_ENTER_KEY_COMMAND: ScannerProgrammingCode = {
  fnc3: Code128Fnc3.leading,
  value: 'N6S06201007S0680100DB0EB01',
};
/** "Standard Product Defaults" from the Honeywell quick start guides: the menu code ends with FNC3. */
export const HONEYWELL_DEFAULTS_COMMAND: ScannerProgrammingCode = { fnc3: Code128Fnc3.trailing, value: '~DEFALT.' };
/** "Restore Defaults" from the Zebra DS2208 product reference guide. */
export const ZEBRA_RESTORE_DEFAULTS_COMMAND: ScannerProgrammingCode = { fnc3: Code128Fnc3.leading, value: '91' };

export enum ScannerBrand {
  honeywell = 'honeywell',
  other = 'other',
  zebra = 'zebra',
}

export const SCANNER_BRANDS: readonly ScannerBrand[] = [ScannerBrand.honeywell, ScannerBrand.zebra, ScannerBrand.other];

export const SCANNER_SUFFIX_COMMANDS: Readonly<Partial<Record<ScannerBrand, ScannerProgrammingCode>>> = {
  [ScannerBrand.honeywell]: HONEYWELL_ADD_CR_SUFFIX_COMMAND,
  [ScannerBrand.zebra]: ZEBRA_ADD_ENTER_KEY_COMMAND,
};

export const SCANNER_RESET_COMMANDS: Readonly<Partial<Record<ScannerBrand, ScannerProgrammingCode>>> = {
  [ScannerBrand.honeywell]: HONEYWELL_DEFAULTS_COMMAND,
  [ScannerBrand.zebra]: ZEBRA_RESTORE_DEFAULTS_COMMAND,
};
export const SCANNER_BROADCAST_STEPS: readonly string[] = ['leaveApp', 'openSettings', 'noOutput', 'broadcastOn', 'save'];
