export interface JourneyAssetDTO {
  asset_name: string;
  booked_slot_ids: number[];
  is_provisional: boolean;
  party_sizes: number[];
}

export interface JourneyLegDTO {
  activity_id: number;
  activity_name: string;
  assets: JourneyAssetDTO[];
  attendees: number | null;
  ends_at: string;
  is_exclusive_hire: boolean;
  sequence_number: number;
  starts_at: string;
}

export interface JourneyStepDTO {
  ends_at: string;
  is_parallel: boolean;
  legs: JourneyLegDTO[];
  starts_at: string;
  step_number: number;
}

export interface JourneyDTO {
  attendees: number | null;
  ends_at: string;
  ends_at_is_estimated: boolean;
  is_multi_day: boolean;
  starts_at: string;
  steps: JourneyStepDTO[];
  timezone: string;
}
