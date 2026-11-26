import { Permissions } from './permissions';

const hubManage = [Permissions.CAN_MANAGE_ASSETS_HUB] as const;
const hub = [Permissions.CAN_VIEW_ASSETS_HUB, ...hubManage] as const;
const bookings = [Permissions.CAN_MANAGE_ASSET_BOOKINGS] as const;
const calendarLayout = [Permissions.CAN_MANAGE_ASSET_CALENDAR_LAYOUT] as const;
const dayNotes = [Permissions.CAN_MANAGE_ASSET_DAY_NOTES] as const;
const timeBlocks = [Permissions.CAN_MANAGE_ASSET_TIME_BLOCKS] as const;
const calendar = [Permissions.CAN_VIEW_ASSET_CALENDAR, ...timeBlocks, ...bookings, ...dayNotes, ...calendarLayout] as const;

export const assetBasedPermissions = {
  bookings,
  calendar,
  calendarLayout,
  dayNotes,
  hub,
  hubManage,
  parentRoute: [...hub, ...calendar],
  timeBlocks,
} as const;
