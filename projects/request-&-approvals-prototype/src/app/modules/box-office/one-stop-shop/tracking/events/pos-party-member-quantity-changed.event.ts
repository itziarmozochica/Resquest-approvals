import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosPartyMemberQuantityChangedData {
  memberName: string;
  newQuantity: number;
  previousQuantity: number;
}

export const posPartyMemberQuantityChanged = defineEvent<PosPartyMemberQuantityChangedData>('pos.party.member.quantity.changed');
