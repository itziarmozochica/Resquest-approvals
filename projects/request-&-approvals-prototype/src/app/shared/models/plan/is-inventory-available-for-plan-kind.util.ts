import { PlanKind } from './plan-kind.enum';

export function isInventoryAvailableForPlanKind(kind: PlanKind | null | undefined): boolean {
  return kind !== PlanKind.AUCTION && kind !== PlanKind.PRIZE_DRAW;
}
