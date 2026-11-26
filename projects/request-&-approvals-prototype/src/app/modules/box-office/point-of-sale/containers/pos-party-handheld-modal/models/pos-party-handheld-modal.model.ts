import type { MultiStepReservedIntent } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import type { PartyQuantities } from '@fz/ticketing';

/** The two header sheets: the date button opens `date`, the person button opens `party`. */
export const POS_PARTY_HANDHELD_SHEET = {
  Date: 'date',
  Party: 'party',
} as const;

export type PosPartyHandheldSheet = (typeof POS_PARTY_HANDHELD_SHEET)[keyof typeof POS_PARTY_HANDHELD_SHEET];

/** Both are the shell's reserved intents: `cancel` closes uncompleted, `close` closes `{ completed: true }` (Apply). */
export type PosPartyHandheldIntent = Extract<MultiStepReservedIntent, 'cancel' | 'close'>;

export interface PosPartyHandheldContext {
  readonly draftQuantities: PartyQuantities;
}

/** Payload handed to the sheet through `IGNT_DIALOG_DATA`: which sheet, and the party the store holds when it opens. */
export interface PosPartyHandheldModalData {
  readonly quantities: PartyQuantities;
  readonly sheet: PosPartyHandheldSheet;
}
