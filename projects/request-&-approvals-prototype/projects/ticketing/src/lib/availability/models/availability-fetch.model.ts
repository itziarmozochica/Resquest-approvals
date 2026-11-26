export interface AvailabilityFetchContext {
  readonly isFastLoad: boolean;
  readonly partnerId: string;
  readonly planId: string;
}

export type AvailabilityFetchGate = (context: AvailabilityFetchContext) => boolean;

export interface AvailabilityFetchConfig {
  readonly parallelLegs?: AvailabilityFetchGate;
  readonly preloadFollowingDays?: AvailabilityFetchGate;
  readonly timeWindows?: AvailabilityFetchGate;
}

export type AvailabilityFetchOptimisation = keyof AvailabilityFetchConfig;
