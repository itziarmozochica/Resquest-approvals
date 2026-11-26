import { getCurrencySymbol } from '@angular/common';

import { PlanDetail } from '@fz-original/app/shared/models/plan/plan-detail.model';

export function planCurrencyOf(planDetail: Pick<PlanDetail, 'venues'> | null): string | null {
  return planDetail?.venues?.[0]?.currency ?? null;
}

/** `CODE (symbol)`, or the bare code when the locale has no symbol of its own for it. */
export function formatCurrencyDisplay(code: string, locale: string): string {
  const symbol = getCurrencySymbol(code, 'narrow', locale);

  return symbol === code ? code : `${code} (${symbol})`;
}
