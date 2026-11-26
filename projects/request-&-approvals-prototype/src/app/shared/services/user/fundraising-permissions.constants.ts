import { Permissions } from './permissions';

const donationPages = [Permissions.CAN_MANAGE_DONATION_PAGES] as const;
const donationPrompts = [Permissions.CAN_MANAGE_DONATION_PROMPTS] as const;
const giftOfficers = [Permissions.CAN_MANAGE_GUEST_GIFT_OFFICERS] as const;
const guestDocuments = [Permissions.CAN_VIEW_GUEST_DOCUMENTS] as const;
const guestGivingHistoryImport = [Permissions.CAN_IMPORT_GUEST_GIVING_HISTORY] as const;
const guestProfilesDelete = [Permissions.CAN_DELETE_GUEST_PROFILES] as const;
const guestProfilesExport = [Permissions.CAN_EXPORT_GUEST_PROFILES] as const;
const guestProfileSettings = [Permissions.CAN_CONFIGURE_GUEST_PROFILE_SETTINGS] as const;
const guestProfiles = [Permissions.CAN_VIEW_GUEST_PROFILES] as const;
const guestProfilesGivingEngagement = [Permissions.CAN_VIEW_GUEST_GIVING_ENGAGEMENT] as const;
const guestProfilesManage = [Permissions.CAN_MANAGE_GUEST_PROFILES] as const;
const guestProfilesManageAll = [Permissions.CAN_MANAGE_ALL_GUEST_PROFILES] as const;
const guestRelationships = [Permissions.CAN_MANAGE_GUEST_RELATIONSHIPS] as const;
const guestTags = [Permissions.CAN_MANAGE_GUEST_TAGS] as const;
const memberships = [Permissions.CAN_MANAGE_MEMBERSHIPS, Permissions.CAN_VIEW_GUEST_PROFILES] as const;
const pipeline = [Permissions.CAN_MANAGE_FUNDRAISING_PIPELINE] as const;

function union(...groups: readonly (readonly Permissions[])[]): readonly Permissions[] {
  return [...new Set(groups.flat())];
}

export function hasAnyPermission(userService: { hasPermission(action: string): boolean }, permissions: readonly Permissions[]): boolean {
  return permissions.some(permission => userService.hasPermission(permission));
}

export const fundraisingPermissions = {
  donationPages,
  donationPrompts,
  giftOfficers,
  guestDocuments,
  guestGivingHistoryImport,
  guestProfiles,
  guestProfilesDelete,
  guestProfileSettings,
  guestProfilesExport,
  guestProfilesGivingEngagement,
  guestProfilesManage,
  guestProfilesManageAll,
  guestProfilesParentRoute: union(guestProfiles, guestProfileSettings),
  guestRelationships,
  guestTags,
  memberships,
  parentRoute: union(donationPrompts, donationPages, pipeline),
  pipeline,
  terminology: union(guestProfiles, guestProfileSettings),
} as const;
