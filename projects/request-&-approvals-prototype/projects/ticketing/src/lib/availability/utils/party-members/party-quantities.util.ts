import type { PartyMember, PartyQuantities } from '../../models/party-members/party-members.model';

export function partyQuantityTotal(quantities: PartyQuantities): number {
  return Object.values(quantities).reduce((total: number, quantity: number) => total + quantity, 0);
}

export function reconcilePartyQuantities(current: PartyQuantities, members: readonly PartyMember[]): PartyQuantities {
  return Object.fromEntries(members.map((member: PartyMember) => [member.key, Math.max(0, current[member.key] ?? 0)]));
}

export function canDecreasePartyMember(quantities: PartyQuantities, memberKey: string): boolean {
  return (quantities[memberKey] ?? 0) > 0;
}

export function setPartyMemberQuantity(quantities: PartyQuantities, memberKey: string, quantity: number): PartyQuantities {
  return { ...quantities, [memberKey]: Math.max(0, Math.floor(quantity)) };
}
