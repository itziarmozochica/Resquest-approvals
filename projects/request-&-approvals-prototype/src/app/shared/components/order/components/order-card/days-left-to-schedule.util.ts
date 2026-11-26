import { EntitlementsInfo } from '../../../../models/order/entitlements-info.model';

export function getDaysLeftToSchedule(entitlementsInfo: EntitlementsInfo | null | undefined): number {
  if (!entitlementsInfo?.maxRescheduleDate) {
    return 0;
  }
  const now = new Date();
  const maxDate = new Date(entitlementsInfo.maxRescheduleDate);
  const diffMs = maxDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
