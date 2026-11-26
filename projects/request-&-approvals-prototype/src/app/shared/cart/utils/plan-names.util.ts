import { CartSession } from '../../models/cart/cart-session.model';

export function planNameForSession(
  planNamesByPlanId: ReadonlyMap<number, string> | null,
  session: CartSession,
  showPlanNames: boolean,
): string | null {
  if (!showPlanNames || planNamesByPlanId === null || session.mainPlanId == null) {
    return null;
  }
  return planNamesByPlanId.get(session.mainPlanId) ?? null;
}
