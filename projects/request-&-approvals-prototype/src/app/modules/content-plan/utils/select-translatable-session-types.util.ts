import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';

import { PlanSessionType } from '../models/plan-session-types.model';

const PLAN_KINDS_WITHOUT_TRANSLATABLE_SESSION_TYPES: ReadonlySet<string> = new Set<string>([
  PlanKind.AUCTION,
  PlanKind.WAITLIST,
  PlanKind.LINK_OUT,
]);

export function selectTranslatableSessionTypes(planType: string, sessionTypes: readonly PlanSessionType[]): readonly PlanSessionType[] {
  if (PLAN_KINDS_WITHOUT_TRANSLATABLE_SESSION_TYPES.has(planType)) {
    return [];
  }
  return sessionTypes;
}
