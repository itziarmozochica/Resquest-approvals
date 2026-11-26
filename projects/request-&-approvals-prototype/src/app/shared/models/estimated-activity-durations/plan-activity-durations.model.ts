import { CartSession } from '../cart/cart-session.model';

export interface ActivityDurationEstimateData {
  base_max_minutes: number;
  base_min_minutes: number;
  floor_minutes: number;
  per_person_minutes: number;
  per_person_cap_people?: number | null;
  worst_case_minutes?: number | null;
}

export interface DurationRange {
  maxMinutes: number;
  minMinutes: number;
}

export interface EstimatedActivityDurationsData {
  group_id_by_session_type_id: Record<string, number>;
  session_type_groups: Record<string, ActivityDurationEstimateData>;
}

export enum WorstCaseDurationKind {
  Minutes = 'minutes',
  MissingAssets = 'missingAssets',
  NotExposed = 'notExposed',
  Unknown = 'unknown',
}

export type WorstCaseDuration =
  | { kind: WorstCaseDurationKind.MissingAssets | WorstCaseDurationKind.NotExposed | WorstCaseDurationKind.Unknown }
  | { kind: WorstCaseDurationKind.Minutes; minutes: number };

export class ActivityDurationEstimate {
  constructor(
    readonly floorMinutes: number,
    readonly baseMinMinutes: number,
    readonly baseMaxMinutes: number,
    readonly perPersonMinutes: number,
    readonly perPersonCapPeople: number | null = null,
  ) {}

  durationRange(partySize: number): DurationRange {
    // Split sub-groups run in parallel, so only the largest share one asset takes adds per person minutes.
    const perPersonPartySize = this.perPersonCapPeople === null ? partySize : Math.min(partySize, this.perPersonCapPeople);
    return {
      maxMinutes: this.#durationInMinutes(this.baseMaxMinutes, perPersonPartySize),
      minMinutes: this.#durationInMinutes(this.baseMinMinutes, perPersonPartySize),
    };
  }

  #durationInMinutes(baseMinutes: number, partySize: number): number {
    return Math.max(this.floorMinutes, baseMinutes + this.perPersonMinutes * partySize);
  }
}

export class PlanActivityDurations {
  readonly #estimateByGroupId: ReadonlyMap<number, ActivityDurationEstimate>;
  readonly #groupIdBySessionTypeId: ReadonlyMap<number, number>;
  readonly #worstCaseByGroupId: ReadonlyMap<number, WorstCaseDuration>;

  constructor(
    groupIdBySessionTypeId: ReadonlyMap<number, number>,
    estimateByGroupId: ReadonlyMap<number, ActivityDurationEstimate>,
    worstCaseByGroupId: ReadonlyMap<number, WorstCaseDuration> = new Map(),
  ) {
    this.#groupIdBySessionTypeId = groupIdBySessionTypeId;
    this.#estimateByGroupId = estimateByGroupId;
    this.#worstCaseByGroupId = worstCaseByGroupId;
  }

  durationRangeForGroup(cartSessions: readonly CartSession[], groupId: number): DurationRange | null {
    const estimate = this.#estimateByGroupId.get(groupId);
    if (estimate === undefined) {
      return null;
    }
    const partySize = this.partySizeOfGroup(cartSessions, groupId);
    return partySize === 0 ? null : estimate.durationRange(partySize);
  }

  groupIdOf(cartSession: CartSession): number | null {
    const sessionTypeId = cartSession.sessionType?.id;
    if (sessionTypeId === undefined) {
      return null;
    }
    return this.#groupIdBySessionTypeId.get(sessionTypeId) ?? null;
  }

  partySizeOfGroup(cartSessions: readonly CartSession[], groupId: number): number {
    return cartSessions.reduce(
      (partySize: number, cartSession: CartSession) =>
        cartSession.units > 0 && this.groupIdOf(cartSession) === groupId ? partySize + cartSession.units : partySize,
      0,
    );
  }

  worstCaseOf(sessionTypeId: number): WorstCaseDuration {
    const groupId = this.#groupIdBySessionTypeId.get(sessionTypeId);
    const worstCase = groupId === undefined ? undefined : this.#worstCaseByGroupId.get(groupId);
    return worstCase ?? { kind: WorstCaseDurationKind.Unknown };
  }
}
