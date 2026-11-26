import type { PartyFitParams, PartyMember, PartySessionChoice, SessionQuantities } from '@fz/ticketing';

export enum PartyAllocationMode {
  Single = 'single',
  Split = 'split',
}

export type MemberSessionAllocation = ReadonlyMap<number, number>;

export interface TranslatableText {
  readonly key: string;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface AlertVm {
  readonly key: string;
  readonly text: string | null;
}

export interface SessionPriceVm {
  readonly bookingFee: TranslatableText | null;
  readonly price: string;
}

export interface SessionTileVm extends SessionPriceVm {
  readonly isSelected: boolean;
  readonly name: string;
  readonly sessionId: number;
}

export interface SessionCounterVm extends SessionTileVm {
  readonly canDecrease: boolean;
  readonly canIncrease: boolean;
  readonly limitLeft: number | null;
  readonly quantity: number;
}

export interface MemberSectionVm {
  readonly assigned: number;
  readonly canSplit: boolean;
  readonly counters: readonly SessionCounterVm[];
  readonly hiddenCount: number;
  readonly isComplete: boolean;
  readonly isSplit: boolean;
  readonly memberKey: string;
  readonly name: string;
  readonly quantity: number;
  readonly tiles: readonly SessionTileVm[];
}

export interface PartySessionPickerSelection {
  readonly allocation: ReadonlyMap<string, MemberSessionAllocation>;
  readonly modes: ReadonlyMap<string, PartyAllocationMode>;
}

export interface PartySessionPickerReopen {
  readonly alert: AlertVm;
  readonly selection: PartySessionPickerSelection;
}

export interface PosPartySessionPickerModalData {
  readonly choice: PartySessionChoice;
  readonly fitParams: PartyFitParams;
  readonly locale: string;
  readonly members: readonly PartyMember[];
  readonly reopen: PartySessionPickerReopen | null;
  readonly subtitle: string;
}

export interface PosPartySessionPickerModalResult {
  readonly nextQuantitiesBySessionId: SessionQuantities;
  readonly selection: PartySessionPickerSelection;
}
