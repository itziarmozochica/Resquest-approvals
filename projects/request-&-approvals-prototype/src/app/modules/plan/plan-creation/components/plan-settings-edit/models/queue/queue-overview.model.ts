export interface QueueMetricData {
  breakdown: Record<string, unknown>[];
  display_name_key?: string | null;
  key: string;
  numeric_value?: number | null;
  render_type: string;
  series: Record<string, unknown>[];
  status: string;
  unit?: string | null;
  updated_at?: string | null;
  value?: string | number | null;
}

export interface QueueOverviewConstraintsData {
  global_hard_max: number;
  global_max: number;
  global_soft_max: number;
  is_seating: boolean;
  non_seating_hard_max: number;
  non_seating_max: number;
  non_seating_soft_max: number;
  plan_capacity_per_time_slot?: number | null;
  seating_hard_max: number;
  seating_max: number;
  seating_soft_max: number;
}

export interface QueueOverviewData {
  constraints?: QueueOverviewConstraintsData;
  metrics: QueueMetricData[];
  status: string;
  waiting_room_id: string;
  warnings: string[];
}

export interface QueueMetric {
  breakdown: Record<string, unknown>[];
  displayNameKey: string | null;
  key: string;
  numericValue: number | null;
  renderType: string;
  series: Record<string, unknown>[];
  status: string;
  unit: string | null;
  updatedAt: string | null;
  value: string | number | null;
}

export interface QueueOverviewConstraints {
  globalHardMax: number;
  globalMax: number;
  globalSoftMax: number;
  isSeating: boolean;
  nonSeatingHardMax: number;
  nonSeatingMax: number;
  nonSeatingSoftMax: number;
  planCapacityPerTimeSlot: number | null;
  seatingHardMax: number;
  seatingMax: number;
  seatingSoftMax: number;
}

export interface QueueOverview {
  constraints: QueueOverviewConstraints | null;
  metrics: QueueMetric[];
  status: string;
  waitingRoomId: string;
  warnings: string[];
}
