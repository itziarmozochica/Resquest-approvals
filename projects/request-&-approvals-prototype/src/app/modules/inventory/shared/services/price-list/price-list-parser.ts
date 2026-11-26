import { Injectable } from '@angular/core';

import {
  DateRange,
  DateRangeDTO,
  PriceList,
  PriceListAllChannelsCreate,
  PriceListCreate,
  PriceListCreateDTO,
  PriceListDTO,
  PriceListUpdate,
  PriceListUpdateDTO,
  TargetedTimeSlot,
  TargetedTimeSlotDTO,
} from '../../../../sessions/shared/models/price-list.model';

@Injectable({
  providedIn: 'root',
})
export class PriceListParser {
  fromDTO({
    id,
    name,
    enabled,
    parent_price_list_id: parentPriceListId,
    parent_price_list_name: parentPriceListName,
    family_base_price_list_id: familyBasePriceListId,
    activation_ranges,
    targeted_time_slots_settings,
    channels,
    channel_ids: channelIds,
    applies_to_all_channels: appliesToAllChannels,
    currency,
    has_prices_to_be_set: hasPricesToBeSet,
    targeted_tier_id: targetedTierId,
    default_ordering: defaultOrdering,
    archived_at,
  }: PriceListDTO): PriceList {
    const activationRanges = activation_ranges?.map(range => this.parseDateRangeDTO(range));
    const targetedTimeSlots = targeted_time_slots_settings?.map(timeslot => this.parseTargetedTimeSlotDTO(timeslot));

    return {
      id,
      name,
      enabled,
      appliesToAllChannels,
      currency,
      ...(targetedTierId && { targetedTierId }),
      ...(parentPriceListId && { parentPriceListId }),
      ...(parentPriceListName && { parentPriceListName }),
      ...(familyBasePriceListId && { familyBasePriceListId }),
      ...(channels && { channels }),
      ...(channelIds && { channelIds }),
      ...(activationRanges && { activationRanges }),
      ...(targetedTimeSlots && { targetedTimeSlots }),
      hasPricesToBeSet,
      defaultOrdering,
      archivedAt: archived_at ? new Date(archived_at) : null,
    } as PriceList;
  }

  toCreateDTO(newList: PriceListCreate): PriceListCreateDTO {
    const { name, enabled, parentPriceListId, activationRanges, targetedTimeSlots, targetedTierId } = newList;

    const activation_ranges = activationRanges?.map(range => this.parseDateRange(range));
    const targeted_time_slots_settings = targetedTimeSlots?.map(timeslot => this.parseTargetedTimeSlot(timeslot));

    return {
      name,
      enabled,
      parent_price_list_id: parentPriceListId ?? null,
      ...(targetedTierId ? { targeted_tier_id: targetedTierId } : null),
      ...(activation_ranges ? { activation_ranges } : null),
      ...(targeted_time_slots_settings ? { targeted_time_slots_settings } : null),
      ...(this.appliesToAllChannels(newList) ? null : { channels: newList.channels }),
    };
  }

  toUpdateDTO(list: PriceListUpdate): PriceListUpdateDTO {
    const result: PriceListUpdateDTO & Partial<Pick<PriceListCreateDTO, 'parent_price_list_id'>> = { ...this.toCreateDTO(list) };
    delete result.parent_price_list_id;
    return result;
  }

  private appliesToAllChannels(list: PriceListCreate): list is PriceListAllChannelsCreate {
    return list.appliesToAllChannels;
  }

  private parseDateRange({ from, to }: DateRange): DateRangeDTO {
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  parseDateRangeDTO({ from, to }: DateRangeDTO): DateRange {
    return {
      from: new Date(from),
      to: new Date(to),
    };
  }

  private parseTargetedTimeSlot({ weekdays, startDate, startTime, endDate, endTime, timezone }: TargetedTimeSlot): TargetedTimeSlotDTO {
    return {
      weekdays,
      timezone,
      date_start: startDate,
      date_end: endDate,
      start_time: startTime,
      end_time: endTime,
    };
  }

  private parseTargetedTimeSlotDTO({
    weekdays,
    date_start,
    date_end,
    start_time,
    end_time,
    timezone,
  }: TargetedTimeSlotDTO): TargetedTimeSlot {
    return {
      weekdays,
      timezone,
      startDate: date_start,
      endDate: date_end,
      startTime: start_time,
      endTime: end_time,
    };
  }
}
