import { IMoney, Money } from '@fz-original/app/shared/models/money.model';

import { DateRange, DateRangeDTO, WeekDay } from '../../../../../sessions/shared/models/price-list.model';

// DTO Models (snake_case) - Response from backend
export interface TargetedTierDTO {
  color: string;
  id: number;
  name: string;
}

export interface PriceMatrixItemDTO {
  applies_to_all_channels: boolean;
  channels: string[] | null;
  id: string;
  is_base: boolean;
  enabled: boolean;
  activation_ranges: DateRangeDTO[] | null;
  must_use_tax_base: boolean;
  name: string;
  prices: PriceMatrixPriceDTO[];
  targeted_tier: TargetedTierDTO | null;
  targeted_time_slots: TargetedTimeSlotDTO[] | null;
}

export interface TargetedTimeSlotDTO {
  date_end: string;
  date_start: string;
  end_date: string;
  end_time: string;
  start_date: string;
  start_time: string;
  timezone: string;
  weekdays: WeekDay[];
}

export interface PriceMatrixPriceDTO {
  price_list_item_id: string;
  session_type_id: number;
  strikethrough_price: IMoney | null;
  surcharge_price: IMoney;
  ticket_price: IMoney;
}

export interface PriceMatrixResponseDTO {
  must_use_tax_base: boolean;
  price_lists: PriceMatrixItemDTO[];
}

// Frontend Models (camelCase) - Used in the application
export interface TargetedTier {
  color: string;
  id: number;
  name: string;
}

export interface PriceMatrixItemBase {
  appliesToAllChannels: boolean;
  channels: string[] | null;
  id: string;
  isBase: boolean;
  enabled: boolean;
  activationRanges: DateRange[] | null;
  mustUseTaxBase: boolean;
  name: string;
  prices: PriceMatrixPrice[];
  targetedTier: TargetedTier | null;
  targetedTimeSlots: TargetedTimeSlot[] | null;
}

export interface PriceMatrixItemAllChannels extends PriceMatrixItemBase {
  appliesToAllChannels: true;
}

export interface PriceMatrixItemNotAllChannels extends PriceMatrixItemBase {
  appliesToAllChannels: false;
  channels: string[];
}

export type PriceMatrixItem = PriceMatrixItemAllChannels | PriceMatrixItemNotAllChannels;

export interface TargetedTimeSlot {
  dateEnd: string;
  dateStart: string;

  endDate: string;
  endTime: string;

  startDate: string;
  startTime: string;

  timezone: string;
  weekdays: WeekDay[];
}

export interface PriceMatrixPrice {
  priceListItemId: string;
  sessionTypeId: number;
  strikethroughPrice: Money | null;
  surchargePrice: Money;
  ticketPrice: Money;
}

// export interface PriceMatrixResponse extends IBaseResponse<PriceMatrixItem[]> {}
export interface PriceMatrixResponse {
  mustUseTaxBase: boolean;
  priceLists: PriceMatrixItem[];
}
