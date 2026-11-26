export interface JourneyAsset {
  readonly assetName: string;
  readonly bookedSlotIds: readonly number[];
  readonly isProvisional: boolean;
  readonly partySizes: readonly number[];
}

export interface JourneyLeg {
  readonly activityId: number;
  readonly activityName: string;
  readonly assets: readonly JourneyAsset[];
  readonly attendees: number | null;
  readonly endsAt: string;
  readonly isExclusiveHire: boolean;
  readonly sequenceNumber: number;
  readonly startsAt: string;
}

export interface JourneyStep {
  readonly endsAt: string;
  readonly isParallel: boolean;
  readonly legs: readonly JourneyLeg[];
  readonly startsAt: string;
  readonly stepNumber: number;
}

export interface Journey {
  readonly attendees: number | null;
  readonly endsAt: string;
  readonly endsAtIsEstimated: boolean;
  readonly isMultiDay: boolean;
  readonly startsAt: string;
  readonly steps: readonly JourneyStep[];
  readonly timezone: string;
}
