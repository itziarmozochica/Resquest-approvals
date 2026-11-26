import { MenuItem } from '@fz-original/app/shared/models/header/header.model';

/**
 * Id of the mobile/tablet header action that opens the identify-member flow.
 *
 * OSS and POS render the same header from their own `computed()`, so the id has to be one
 * constant: a string typo on either side silently drops the action from that flow — see the
 * lockstep contract in `one-stop-shop/AGENTS.md`.
 */
export const ossIdentifyMemberActionId = 'oss-identify-member';

/** The identify-member entry of the mobile/tablet header menu, tagged with the member's name. */
export function ossIdentifyMemberMenuItem(label: string, memberName: string | null): MenuItem {
  return {
    icon: ['fal', 'address-card'],
    id: ossIdentifyMemberActionId,
    label,
    tag: memberName,
    tagSentiment: 'info',
  };
}
