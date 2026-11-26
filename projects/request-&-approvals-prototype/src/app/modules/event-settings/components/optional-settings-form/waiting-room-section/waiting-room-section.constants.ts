import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

export const waitingRoomFormControlName = 'waitingRoom' as const;

export const waitingRoomI18n = 'eventSettings.waitingRoom';

export const defaultMarketPlaceId = 'fever-marketplace';

export const visibilityMode = {
  VISIBLE_AT_PEAK: 'VISIBLE_AT_PEAK',
  ALWAYS_VISIBLE: 'ALWAYS_VISIBLE',
} as const;

export const feverMarketplaceOption: SelectOption = { id: defaultMarketPlaceId, title: 'Default channel for fever-marketplace' } as const;

export const sectionI18n = {
  description: `${waitingRoomI18n}.description`,
  title: `${waitingRoomI18n}.title`,
  channel: `${waitingRoomI18n}.channel`,
  channelHelper: `${waitingRoomI18n}.channelHelper`,
} as const;

export const deleteConfirmI18n = {
  cancel: `${waitingRoomI18n}.disableToggleConfirm.cancel`,
  confirm: `${waitingRoomI18n}.disableToggleConfirm.confirm`,
  message: `${waitingRoomI18n}.disableToggleConfirm.message`,
  title: `${waitingRoomI18n}.disableToggleConfirm.title`,
} as const;

const minMinutesInPreQueue = 5;
export const minutesInPreQueueRange = {
  maxMinutes: 24 * 60, // 24 hours
  minMinutes: minMinutesInPreQueue,
} as const;

export const initialWaitingRoomValues = {
  channelId: '',
  enabled: false,
  launchingDatetime: null as string | null,
  language: '',
  maxOutflow: null as number | null,
  minutesInPreQueue: minMinutesInPreQueue,
  timezone: '',
  visibilityMode: visibilityMode.VISIBLE_AT_PEAK,
  waitingRoomId: null as string | null,
  waitingRoomName: '',
} as const;
