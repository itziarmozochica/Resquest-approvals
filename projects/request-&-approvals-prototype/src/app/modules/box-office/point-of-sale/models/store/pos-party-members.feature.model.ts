import { type DaySummary } from '@fz/ticketing';

export interface PosPartyDay {
  readonly daySummary: DaySummary | null;
}

export interface PosPartyMembersFeatureState {
  partyCategory: string | null;
}

export const initialPartyMembersState: PosPartyMembersFeatureState = {
  partyCategory: null,
};
