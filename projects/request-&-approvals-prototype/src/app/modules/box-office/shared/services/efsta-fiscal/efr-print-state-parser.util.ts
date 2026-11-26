import { EfrPrinterState } from './models/efr-printer-state.model';
import {
  EfrStateObservation,
  EfrStateReadout,
  EfrStateSignal,
  EfrStateUnreadableReason,
  EfrWireDialect,
  EfrWireField,
} from './models/efr-state-readout.model';

const MAX_LOGGED_BODY_KEYS = 20;
const MAX_LOGGED_BODY_KEY_LENGTH = 40;
const EFR_STATE_SIGNALS: readonly EfrStateSignal[] = ['coverOpen', 'dayOpen', 'paperEnd', 'paperNearEnd', 'printerWork'];

export interface EfrObservedLeaf<TValue> {
  readonly isViolated: boolean;
  readonly value: TValue | null;
}

export interface EfrWireLeafEntry {
  readonly field: EfrWireField;
  readonly leaf: EfrObservedLeaf<unknown>;
}

function notObserved<TValue>(): EfrObservedLeaf<TValue> {
  return { isViolated: false, value: null };
}

function violated<TValue>(): EfrObservedLeaf<TValue> {
  return { isViolated: true, value: null };
}

export function isPlainObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export function observeBoolean(source: Record<string, unknown>, key: string): EfrObservedLeaf<boolean> {
  const raw = source[key];
  if (raw == null) {
    return notObserved();
  }
  return typeof raw === 'boolean' ? { isViolated: false, value: raw } : violated();
}

export function observeNestedBoolean(body: Record<string, unknown>, containerKey: string, key: string): EfrObservedLeaf<boolean> {
  const container = body[containerKey];
  if (!isPlainObject(container)) {
    return notObserved();
  }
  // Safe after the isPlainObject guard: a plain object is indexable by string key.
  return observeBoolean(container as Record<string, unknown>, key);
}

export function observeStringArray(source: Record<string, unknown>, key: string): EfrObservedLeaf<readonly string[]> {
  const raw = source[key];
  if (raw == null) {
    return notObserved();
  }
  if (!Array.isArray(raw) || !raw.every((member: unknown) => typeof member === 'string')) {
    return violated();
  }
  // Safe after the Array.isArray + every-member-is-a-string guard.
  return { isViolated: false, value: raw as readonly string[] };
}

export function observeDateString(source: Record<string, unknown>, key: string): EfrObservedLeaf<string> {
  const raw = source[key];
  if (raw == null) {
    return notObserved();
  }
  return typeof raw === 'string' ? { isViolated: false, value: raw } : violated();
}

export function observeNumber(source: Record<string, unknown>, key: string): EfrObservedLeaf<number> {
  const raw = source[key];
  if (raw == null) {
    return notObserved();
  }
  return typeof raw === 'number' ? { isViolated: false, value: raw } : violated();
}

export function buildObservation(
  entries: readonly EfrWireLeafEntry[],
  state: EfrPrinterState,
  disagreedSignals: readonly EfrStateSignal[],
): EfrStateObservation {
  return {
    disagreedSignals,
    ignoredFields: entries.filter((entry: EfrWireLeafEntry) => entry.leaf.isViolated).map((entry: EfrWireLeafEntry) => entry.field),
    observedFields: entries.filter((entry: EfrWireLeafEntry) => entry.leaf.value !== null).map((entry: EfrWireLeafEntry) => entry.field),
    state,
  };
}

export function parseEfrPrintState(body: unknown, dialect: EfrWireDialect): EfrStateReadout {
  if (!isPlainObject(body)) {
    return {
      blockingViolations: [],
      bodyKeyCount: 0,
      bodyKeys: [],
      ignoredFields: [],
      kind: 'unreadable',
      missingSignals: [],
      reason: 'body-not-an-object',
      source: dialect.source,
    };
  }

  // Safe after the isPlainObject guard: the wire body is read as a string-keyed record only.
  const wireBody = body as Record<string, unknown>;
  const bodyKeys = Object.keys(wireBody);
  const observation = dialect.observeState(wireBody);
  const blockingViolations = observation.ignoredFields.filter((field: EfrWireField) => dialect.blockingFields.includes(field));
  const missingSignals = dialect.requiredSignals.filter((signal: EfrStateSignal) => observation.state[signal] === null);
  const reason = resolveUnreadableReason(observation, blockingViolations, missingSignals);

  if (reason !== null) {
    return {
      blockingViolations,
      bodyKeyCount: bodyKeys.length,
      bodyKeys: bodyKeys.slice(0, MAX_LOGGED_BODY_KEYS).map((key: string) => key.slice(0, MAX_LOGGED_BODY_KEY_LENGTH)),
      ignoredFields: observation.ignoredFields,
      kind: 'unreadable',
      missingSignals,
      reason,
      source: dialect.source,
    };
  }

  return {
    disagreedSignals: observation.disagreedSignals,
    ignoredFields: observation.ignoredFields,
    kind: 'observed',
    notObservedSignals: EFR_STATE_SIGNALS.filter((signal: EfrStateSignal) => observation.state[signal] === null),
    source: dialect.source,
    state: observation.state,
  };
}

function resolveUnreadableReason(
  observation: EfrStateObservation,
  blockingViolations: readonly EfrWireField[],
  missingSignals: readonly EfrStateSignal[],
): EfrStateUnreadableReason | null {
  if (blockingViolations.length > 0) {
    return 'signal-type-violation';
  }
  if (observation.observedFields.length === 0) {
    return 'no-signal-observed';
  }
  if (missingSignals.length > 0) {
    return 'required-signal-missing';
  }
  return null;
}
