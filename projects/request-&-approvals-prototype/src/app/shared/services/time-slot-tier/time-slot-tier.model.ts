export interface TimeSlotTierDTO {
  id: number;
  name: string;
  color: string;
}

export interface EnrichedTimeSlotTierDTO extends TimeSlotTierDTO {
  time_slots_count: number;
  price_lists_count: number;
}

export type TimeSlotTier = TimeSlotTierDTO;

export interface EnrichedTimeSlotTier extends TimeSlotTier {
  timeSlotsCount: number;
  priceListsCount: number;
}
