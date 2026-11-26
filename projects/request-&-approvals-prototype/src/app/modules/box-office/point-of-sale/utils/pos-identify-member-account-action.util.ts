import { MenuItem } from '@fz-original/app/shared/models/header/header.model';

export const posIdentifyMemberAccountActionId = 'pos-identify-member-account';

export const posRemoveMemberAccountActionId = 'pos-remove-member-account';

export function posIdentifyMemberAccountMenuItem(label: string, badge: string | null): MenuItem {
  return {
    icon: ['fal', 'address-card'],
    id: posIdentifyMemberAccountActionId,
    label,
    tag: badge,
    tagSentiment: 'info',
  };
}

export function posRemoveMemberAccountMenuItem(label: string): MenuItem {
  return {
    icon: ['fal', 'times'],
    id: posRemoveMemberAccountActionId,
    label,
  };
}
