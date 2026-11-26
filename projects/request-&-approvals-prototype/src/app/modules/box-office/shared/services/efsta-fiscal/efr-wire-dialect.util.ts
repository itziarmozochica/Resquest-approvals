import {
  buildObservation,
  EfrObservedLeaf,
  observeBoolean,
  observeDateString,
  observeNestedBoolean,
  observeNumber,
  observeStringArray,
} from './efr-print-state-parser.util';
import { EfrStateObservation, EfrStateSignal, EfrWireDialect } from './models/efr-state-readout.model';
import { FiscalPrinterStateSource } from './models/fiscal-country-profile.model';

export interface EfrMergedSignal {
  readonly hasDisagreed: boolean;
  readonly value: boolean | null;
}

export function mergeConservative(primary: boolean | null, secondary: boolean | null, unhealthyValue: boolean): EfrMergedSignal {
  if (primary === null) {
    return { hasDisagreed: false, value: secondary };
  }
  if (secondary === null) {
    return { hasDisagreed: false, value: primary };
  }
  if (primary === secondary) {
    return { hasDisagreed: false, value: primary };
  }
  return { hasDisagreed: true, value: unhealthyValue };
}

function observeHungaryState(body: Record<string, unknown>): EfrStateObservation {
  const printerWork = observeBoolean(body, 'PrinterWork');
  const coverOpen = observeNestedBoolean(body, 'SimpleState', 'CoverOpen');
  const dayOpen = observeNestedBoolean(body, 'SimpleState', 'DayOpen');
  const paperEnd = observeNestedBoolean(body, 'SimpleState', 'PaperEnd');
  const paperNearEnd = observeNestedBoolean(body, 'SimpleState', 'PaperNearEnd');
  const warnings = observeStringArray(body, 'Warning');
  const nextZRequired = observeDateString(body, 'NextZRequired');
  const zi = observeNumber(body, 'ZI');

  return buildObservation(
    [
      { field: 'PrinterWork', leaf: printerWork },
      { field: 'SimpleState.CoverOpen', leaf: coverOpen },
      { field: 'SimpleState.DayOpen', leaf: dayOpen },
      { field: 'SimpleState.PaperEnd', leaf: paperEnd },
      { field: 'SimpleState.PaperNearEnd', leaf: paperNearEnd },
      { field: 'Warning', leaf: warnings },
      { field: 'NextZRequired', leaf: nextZRequired },
      { field: 'ZI', leaf: zi },
    ],
    {
      coverOpen: coverOpen.value,
      dayOpen: dayOpen.value,
      nextZRequired: nextZRequired.value,
      paperEnd: paperEnd.value,
      paperNearEnd: paperNearEnd.value,
      printerWork: printerWork.value,
      warnings: warnings.value,
      zi: zi.value,
    },
    [],
  );
}

function observeNestedFlag(body: Record<string, unknown>, containerKey: string, key: string, trueWhen: 0 | 1): EfrObservedLeaf<boolean> {
  const container = body[containerKey];
  if (container === null || typeof container !== 'object' || Array.isArray(container)) {
    return { isViolated: false, value: null };
  }
  const raw = (container as Record<string, unknown>)[key];
  if (raw == null) {
    return { isViolated: false, value: null };
  }
  if (typeof raw === 'boolean') {
    return { isViolated: false, value: raw };
  }
  if (raw === 0 || raw === 1) {
    return { isViolated: false, value: raw === trueWhen };
  }
  return { isViolated: true, value: null };
}

function observePolandState(body: Record<string, unknown>): EfrStateObservation {
  const coverOpenPrimary = observeNestedBoolean(body, 'SimpleState', 'CoverOpen');
  const coverOpenSecondary = observeNestedFlag(body, 'PrinterState', 'cover', 1);
  const dayOpenPrimary = observeNestedBoolean(body, 'SimpleState', 'DayOpen');
  const dayOpenSecondary = observeNestedFlag(body, 'CashRegisterState', 'openDay', 1);
  const paperEndPrimary = observeNestedBoolean(body, 'SimpleState', 'PaperEnd');
  const paperEndSecondary = observeNestedFlag(body, 'PrinterState', 'paperEnd', 1);
  const paperNearEndPrimary = observeNestedBoolean(body, 'SimpleState', 'PaperNearEnd');
  const paperNearEndSecondary = observeNestedFlag(body, 'PrinterState', 'nearEnd', 1);
  const printerWorkPrimary = observeBoolean(body, 'PrinterWork');
  const printerWorkSecondary = observeNestedFlag(body, 'PrinterState', 'online', 0);
  const nextZRequired = observeDateString(body, 'NextZRequired');
  const zi = observeNumber(body, 'ZI');

  const coverOpen = mergeConservative(coverOpenPrimary.value, coverOpenSecondary.value, true);
  const dayOpen = mergeConservative(dayOpenPrimary.value, dayOpenSecondary.value, false);
  const paperEnd = mergeConservative(paperEndPrimary.value, paperEndSecondary.value, true);
  const paperNearEnd = mergeConservative(paperNearEndPrimary.value, paperNearEndSecondary.value, true);
  const printerWork = mergeConservative(printerWorkPrimary.value, printerWorkSecondary.value, false);

  return buildObservation(
    [
      { field: 'SimpleState.CoverOpen', leaf: coverOpenPrimary },
      { field: 'PrinterState.cover', leaf: coverOpenSecondary },
      { field: 'SimpleState.DayOpen', leaf: dayOpenPrimary },
      { field: 'CashRegisterState.openDay', leaf: dayOpenSecondary },
      { field: 'SimpleState.PaperEnd', leaf: paperEndPrimary },
      { field: 'PrinterState.paperEnd', leaf: paperEndSecondary },
      { field: 'SimpleState.PaperNearEnd', leaf: paperNearEndPrimary },
      { field: 'PrinterState.nearEnd', leaf: paperNearEndSecondary },
      { field: 'PrinterWork', leaf: printerWorkPrimary },
      { field: 'PrinterState.online', leaf: printerWorkSecondary },
      { field: 'NextZRequired', leaf: nextZRequired },
      { field: 'ZI', leaf: zi },
    ],
    {
      coverOpen: coverOpen.value,
      dayOpen: dayOpen.value,
      nextZRequired: nextZRequired.value,
      paperEnd: paperEnd.value,
      paperNearEnd: paperNearEnd.value,
      printerWork: printerWork.value,
      warnings: null,
      zi: zi.value,
    },
    collectDisagreedSignals([
      { hasDisagreed: coverOpen.hasDisagreed, signal: 'coverOpen' },
      { hasDisagreed: dayOpen.hasDisagreed, signal: 'dayOpen' },
      { hasDisagreed: paperEnd.hasDisagreed, signal: 'paperEnd' },
      { hasDisagreed: paperNearEnd.hasDisagreed, signal: 'paperNearEnd' },
      { hasDisagreed: printerWork.hasDisagreed, signal: 'printerWork' },
    ]),
  );
}

export const HUNGARY_WIRE_DIALECT: EfrWireDialect = {
  blockingFields: ['NextZRequired', 'PrinterWork', 'SimpleState.CoverOpen', 'SimpleState.DayOpen', 'SimpleState.PaperEnd', 'Warning'],
  observeState: observeHungaryState,
  requiredSignals: [],
  source: 'hungary-printer-state',
  wireFieldsByReadable: {
    coverOpen: ['SimpleState.CoverOpen'],
    dayOpen: ['SimpleState.DayOpen'],
    nextZRequired: ['NextZRequired'],
    paperEnd: ['SimpleState.PaperEnd'],
    paperNearEnd: ['SimpleState.PaperNearEnd'],
    printerWork: ['PrinterWork'],
    warnings: ['Warning'],
  },
};

export const POLAND_WIRE_DIALECT: EfrWireDialect = {
  blockingFields: [
    'PrinterState.cover',
    'PrinterState.online',
    'PrinterState.paperEnd',
    'PrinterWork',
    'SimpleState.CoverOpen',
    'SimpleState.PaperEnd',
  ],
  observeState: observePolandState,
  requiredSignals: ['coverOpen', 'paperEnd', 'printerWork'],
  source: 'poland-printer-work',
  wireFieldsByReadable: {
    coverOpen: ['SimpleState.CoverOpen', 'PrinterState.cover'],
    dayOpen: ['SimpleState.DayOpen', 'CashRegisterState.openDay'],
    nextZRequired: ['NextZRequired'],
    paperEnd: ['SimpleState.PaperEnd', 'PrinterState.paperEnd'],
    paperNearEnd: ['SimpleState.PaperNearEnd', 'PrinterState.nearEnd'],
    printerWork: ['PrinterWork', 'PrinterState.online'],
    warnings: [],
  },
};

export const EFR_WIRE_DIALECT_BY_SOURCE: Readonly<Record<FiscalPrinterStateSource, EfrWireDialect>> = {
  'hungary-printer-state': HUNGARY_WIRE_DIALECT,
  'poland-printer-work': POLAND_WIRE_DIALECT,
};

export function resolveEfrWireDialect(source: FiscalPrinterStateSource): EfrWireDialect {
  return EFR_WIRE_DIALECT_BY_SOURCE[source];
}

function collectDisagreedSignals(
  merges: readonly { readonly hasDisagreed: boolean; readonly signal: EfrStateSignal }[],
): readonly EfrStateSignal[] {
  return merges.filter(merge => merge.hasDisagreed).map(merge => merge.signal);
}
