export const PERMISSIONS_IN_ALL_WHITELABELS_KEY = 'permissions_in_all_whitelabels';
export const WHITELABEL_CAN_EDIT_PERMISSION = 'can_edit';

export interface WhitelabelAccess {
  canEdit: boolean;
  whitelabelId: string;
}

export interface WhitelabelAccessListResult {
  accesses: WhitelabelAccess[];
  unrestricted: boolean;
}

export type WhitelabelAccessListData = Record<string, string[]>;
