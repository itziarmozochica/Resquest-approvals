export enum WeekDay {
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
  Sunday = 'sunday',
}

export interface TargetedTimeSlot {
  weekdays: Array<WeekDay>;
  /**
   * YYYY-MM-DD, no ISO format
   */
  startDate: string;
  /**
   * YYYY-MM-DD, no ISO format
   */
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
}
export interface TargetedTimeSlotDTO extends Pick<TargetedTimeSlot, 'weekdays' | 'timezone'> {
  date_start: string;
  date_end: string;
  start_time: string;
  end_time: string;
}

export interface DateRangeDTO {
  from: string;
  to: string;
}

export interface PriceListDTO {
  id: string;
  name: string;
  enabled: boolean;
  parent_price_list_id: null | string;
  parent_price_list_name: null | string;
  family_base_price_list_id: null | string;
  activation_ranges?: Array<DateRangeDTO>;
  targeted_time_slots_settings?: Array<TargetedTimeSlotDTO>;
  targeted_tier_id?: number;
  channels?: Array<string>;
  channel_ids?: Array<string> | null;
  applies_to_all_channels: boolean;
  currency: string;
  has_prices_to_be_set: boolean;
  default_ordering: number;
  archived_at: string | null;
}

type PriceListReadOnlyDTOFields = 'family_base_price_list_id';

export type PriceListCreateDTO = Omit<
  PriceListDTO,
  | 'id'
  | 'currency'
  | 'applies_to_all_channels'
  | 'has_prices_to_be_set'
  | 'default_ordering'
  | 'archived_at'
  | 'parent_price_list_name'
  | PriceListReadOnlyDTOFields
>;
export type PriceListUpdateDTO = Omit<
  PriceListDTO,
  | 'id'
  | 'currency'
  | 'applies_to_all_channels'
  | 'has_prices_to_be_set'
  | 'parent_price_list_id'
  | 'default_ordering'
  | 'archived_at'
  | 'parent_price_list_name'
  | PriceListReadOnlyDTOFields
>;

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PriceListBase {
  id: string;
  name: string;
  enabled: boolean;
  parentPriceListId?: string;
  parentPriceListName?: string;
  familyBasePriceListId?: string;
  activationRanges?: Array<DateRange>;
  targetedTimeSlots?: Array<TargetedTimeSlot>;
  targetedTierId?: number;
  appliesToAllChannels: boolean;
  channels?: Array<string>;
  channelIds?: Array<string>;
  currency: string;
  hasPricesToBeSet?: boolean;
  /** Lower number is 1, which represents the highest priority */
  defaultOrdering: number;
  archivedAt: Date | null;
}

export interface PriceListNotAllChannels extends PriceListBase {
  appliesToAllChannels: false;
  channels: Array<string>;
}

export interface PriceListAllChannels extends Omit<PriceListBase, 'channels'> {
  appliesToAllChannels: true;
}

export type PriceList = PriceListAllChannels | PriceListNotAllChannels;

export interface PriceListWithTotal {
  priceLists: Array<PriceList>;
  totalArchived: number;
}

type PriceListReadOnlyFields = 'familyBasePriceListId';

export type PriceListAllChannelsCreate = Omit<
  PriceListAllChannels,
  'id' | 'currency' | 'defaultOrdering' | 'archivedAt' | PriceListReadOnlyFields
>;
export type PriceListNotAllChannelsCreate = Omit<
  PriceListNotAllChannels,
  'id' | 'currency' | 'defaultOrdering' | 'archivedAt' | PriceListReadOnlyFields
>;

export type PriceListCreate = PriceListAllChannelsCreate | PriceListNotAllChannelsCreate;

export type PriceListUpdate =
  | Omit<PriceListAllChannels, 'id' | 'currency' | 'parentPriceListId' | 'defaultOrdering' | 'archivedAt' | PriceListReadOnlyFields>
  | Omit<PriceListNotAllChannels, 'id' | 'currency' | 'parentPriceListId' | 'defaultOrdering' | 'archivedAt' | PriceListReadOnlyFields>;

export interface BasePriceListUpdate extends Pick<PriceListUpdate, 'name' | 'enabled'> {
  enabled: true;
}
