export const CalendarEntryPoint = {
  bookingLink: 'booking_link',
  direct: 'direct',
  orderCard: 'order_card',
  reservationHeader: 'reservation_header',
  sidebar: 'sidebar',
} as const;

export type CalendarEntryPointET = (typeof CalendarEntryPoint)[keyof typeof CalendarEntryPoint];

export const BookingMoveMethod = {
  drag: 'drag',
  moveAsset: 'move_asset',
  movePlan: 'move_plan',
  resize: 'resize',
  undo: 'undo',
} as const;

export type BookingMoveMethodET = (typeof BookingMoveMethod)[keyof typeof BookingMoveMethod];

export const AssetBlockMethod = {
  blockForm: 'block_form',
  quickBlock: 'quick_block',
} as const;

export type AssetBlockMethodET = (typeof AssetBlockMethod)[keyof typeof AssetBlockMethod];

export const PlayStateChange = {
  started: 'started',
  stopped: 'stopped',
} as const;

export type PlayStateChangeET = (typeof PlayStateChange)[keyof typeof PlayStateChange];

export const AssetFilterType = {
  allAssets: 'all_assets',
  assets: 'assets',
  assetType: 'asset_type',
  savedView: 'saved_view',
} as const;

export type AssetFilterTypeET = (typeof AssetFilterType)[keyof typeof AssetFilterType];

export const BookingDetailSource = {
  attendee: 'attendee',
  grid: 'grid',
  orderSearch: 'order_search',
} as const;

export type BookingDetailSourceET = (typeof BookingDetailSource)[keyof typeof BookingDetailSource];

export const ActionFailure = {
  client: 'client',
  rejected: 'rejected',
  server: 'server',
} as const;

export type ActionFailureET = (typeof ActionFailure)[keyof typeof ActionFailure];

export const AssetBasedScreen = {
  configFormActivity: 'config_form_activity',
  configFormAsset: 'config_form_asset',
  configFormAssetType: 'config_form_asset_type',
  configFormPack: 'config_form_pack',
  hubsList: 'hubs_list',
} as const;

export const AssetBasedCalendarMode = {
  day: 'day',
  list: 'list',
  week: 'week',
} as const;

export type AssetBasedCalendarModeET = (typeof AssetBasedCalendarMode)[keyof typeof AssetBasedCalendarMode];

export const ASSET_BASED_FEATURE = 'asset-based';

export const ASSET_BASED_AUTO_TICK = 'auto';

export const ASSET_BASED_ERROR_SCOPE = 'asset_based';

export interface AssetBasedRouteState {
  displayMode: string | undefined;
  hubIdParam: string | undefined;
  hubQueryParam: string | undefined;
  modeQueryParam: string | undefined;
  routePath: string | undefined;
  tabQueryParam: string | undefined;
}

// A type alias, not an interface: tracking context factories must return an indexable record.
export type AssetBasedTrackingContext = {
  feature: typeof ASSET_BASED_FEATURE;
  hub_id?: number;
  screen?: string;
  tick_size?: number | typeof ASSET_BASED_AUTO_TICK;
  view_mode?: AssetBasedCalendarModeET;
};

export interface ClassifiedActionFailure {
  failure: ActionFailureET;
  reason?: string;
  status: number;
}

export const ASSET_BASED_ENTRY_POINT_STATE_KEY = 'assetBasedEntryPoint';

export const POPSTATE_NAVIGATION_TRIGGER = 'popstate';

export const HEARTBEAT_ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export const VISIBLE_DOCUMENT_STATE: DocumentVisibilityState = 'visible';

export const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

export const HEARTBEAT_ACTIVITY_WINDOW_MS = 15 * 60 * 1000;

/** A timer that fires a hair early must not count the boundary it is about to reach as the next one. */
export const HEARTBEAT_BOUNDARY_TOLERANCE_MS = 1000;

/** `trackSuccess` is false on the first leg of a two-call move, whose second leg reports the move once. */
export interface BookingMoveTracking {
  data: {
    assetChanged: boolean;
    method: BookingMoveMethodET;
    timeChanged: boolean;
  };
  trackSuccess: boolean;
}
