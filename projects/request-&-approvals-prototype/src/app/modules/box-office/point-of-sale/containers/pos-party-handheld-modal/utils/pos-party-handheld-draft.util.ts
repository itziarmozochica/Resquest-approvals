import { canDecreasePartyMember, partyQuantityTotal, type PartyMember, type PartyQuantities } from '@fz/ticketing';
import type { FztPartyMemberCounterVm } from '@fz/ticketing-ui';

import type { PosPartyHandheldContext } from '../models/pos-party-handheld-modal.model';

export function hasPartyDraft(context: PosPartyHandheldContext): boolean {
  return partyQuantityTotal(context.draftQuantities) >= 1;
}

/** The till's counter rows over the draft, so `canDecrease` follows the same rule as the panel. */
export function buildPartyDraftCountersVm(members: readonly PartyMember[], draft: PartyQuantities): readonly FztPartyMemberCounterVm[] {
  return members.map(
    (member: PartyMember): FztPartyMemberCounterVm => ({
      canDecrease: canDecreasePartyMember(draft, member.key),
      key: member.key,
      name: member.name,
      quantity: draft[member.key] ?? 0,
    }),
  );
}
