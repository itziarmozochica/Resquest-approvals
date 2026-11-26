import { EfrHealthErrorCode } from './efr-health-check.model';
import { EfrPrinterState } from './efr-printer-state.model';
import { FiscalPrinterStateSource } from './fiscal-country-profile.model';

export type EfrStateSignal = 'coverOpen' | 'dayOpen' | 'paperEnd' | 'paperNearEnd' | 'printerWork';

export type EfrWireField =
  | 'CashRegisterState.openDay'
  | 'NextZRequired'
  | 'PrinterState.cover'
  | 'PrinterState.online'
  | 'PrinterState.paperEnd'
  | 'PrinterState.nearEnd'
  | 'PrinterWork'
  | 'SimpleState.CoverOpen'
  | 'SimpleState.DayOpen'
  | 'SimpleState.PaperEnd'
  | 'SimpleState.PaperNearEnd'
  | 'Warning'
  | 'ZI';

export type EfrStateUnreadableReason = 'body-not-an-object' | 'no-signal-observed' | 'required-signal-missing' | 'signal-type-violation';

export type EfrReadableField = EfrStateSignal | 'nextZRequired' | 'warnings';

export interface EfrStateObservation {
  readonly disagreedSignals: readonly EfrStateSignal[];
  readonly ignoredFields: readonly EfrWireField[];
  readonly observedFields: readonly EfrWireField[];
  readonly state: EfrPrinterState;
}

export interface EfrStateObserved {
  readonly disagreedSignals: readonly EfrStateSignal[];
  readonly ignoredFields: readonly EfrWireField[];
  readonly kind: 'observed';
  readonly notObservedSignals: readonly EfrStateSignal[];
  readonly source: FiscalPrinterStateSource;
  readonly state: EfrPrinterState;
}

export interface EfrStateUnreadable {
  readonly blockingViolations: readonly EfrWireField[];
  readonly bodyKeyCount: number;
  readonly bodyKeys: readonly string[];
  readonly ignoredFields: readonly EfrWireField[];
  readonly kind: 'unreadable';
  readonly missingSignals: readonly EfrStateSignal[];
  readonly reason: EfrStateUnreadableReason;
  readonly source: FiscalPrinterStateSource;
}

export interface EfrStateUnreachable {
  readonly kind: 'unreachable';
  readonly source: FiscalPrinterStateSource;
}

export type EfrStateReadout = EfrStateObserved | EfrStateUnreachable | EfrStateUnreadable;

export interface EfrHealthRule {
  readonly code: EfrHealthErrorCode;
  readonly isTriggered: (state: EfrPrinterState) => boolean;
  readonly reads: readonly EfrReadableField[];
}

export interface EfrHealthPolicy {
  readonly rules: readonly EfrHealthRule[];
  readonly source: FiscalPrinterStateSource;
}

export interface EfrWireDialect {
  readonly blockingFields: readonly EfrWireField[];
  readonly observeState: (body: Record<string, unknown>) => EfrStateObservation;
  readonly requiredSignals: readonly EfrStateSignal[];
  readonly source: FiscalPrinterStateSource;
  readonly wireFieldsByReadable: Readonly<Record<EfrReadableField, readonly EfrWireField[]>>;
}
