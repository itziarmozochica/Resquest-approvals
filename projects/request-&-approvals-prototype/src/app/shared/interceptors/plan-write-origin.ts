import { HttpContext, HttpContextToken } from '@angular/common/http';

import { PlanWriteOrigin, QUICK_SETUP_PLAN_WRITE_ORIGIN } from './plan-write-origin-header';

export { PLAN_WRITE_ORIGIN_HEADER, QUICK_SETUP_PLAN_WRITE_ORIGIN, type PlanWriteOrigin } from './plan-write-origin-header';

export const PLAN_WRITE_ORIGIN = new HttpContextToken<PlanWriteOrigin | null>(() => null);

export function quickSetupPlanWriteOriginContext(): HttpContext {
  return new HttpContext().set(PLAN_WRITE_ORIGIN, QUICK_SETUP_PLAN_WRITE_ORIGIN);
}
