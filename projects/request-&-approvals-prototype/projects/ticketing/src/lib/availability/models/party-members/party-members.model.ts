import type { ExplodeLevel } from '../../../core/utils/explode-pipe/explode-level-tree.util';
import type { TimeslotSummary } from '../session-availability-summary.model';
import type { Session } from '../session.model';

export interface PartyMember {
  readonly key: string;
  readonly name: string;
}

export type PartyQuantities = Readonly<Record<string, number>>;

export type SessionQuantities = Readonly<Record<number, number>>;

export interface PartyLeaf {
  readonly key: string;
  readonly name: string;
  readonly path: readonly string[];
}

export interface PartyCategory {
  readonly leafKeys: readonly string[];
  readonly name: string;
}

export interface PartyHierarchy {
  readonly categories: readonly PartyCategory[];
  readonly leaves: readonly PartyLeaf[];
  readonly tree: ExplodeLevel;
}

export interface PartyFitParams {
  readonly canOverrideCapacity: boolean;
  readonly includeTimeSlotCapacity: boolean;
  readonly minutesBeforeToExpire: number;
  readonly selectedQuantities: SessionQuantities;
  readonly timeZone: string;
  readonly now?: number;
}

export interface PartyMemberSessionOptions {
  readonly memberKey: string;
  readonly quantity: number;
  readonly sessions: readonly Session[];
}

export interface PartyFit {
  readonly additionsBySessionId: SessionQuantities;
  readonly isSelectable: boolean;
  readonly needsSessionChoice: boolean;
  readonly nextQuantitiesBySessionId: SessionQuantities;
  readonly startTime: string;
  readonly stock: number;
}

export interface PartySessionChoice {
  readonly fit: PartyFit;
  readonly memberSessionOptions: readonly PartyMemberSessionOptions[];
  readonly timeslot: TimeslotSummary;
}

export interface PartySessionAllocationFit {
  readonly isSelectable: boolean;
  readonly nextQuantitiesBySessionId: SessionQuantities;
  readonly violationMessage: string | null;
}

export interface SharedAvailabilityViolation {
  readonly message: string | null;
  readonly type: string;
}

export interface SessionAdditionStep {
  readonly current: number;
  readonly direction: 1 | -1;
  readonly session: Session;
  readonly timeslot: TimeslotSummary;
}
