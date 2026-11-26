export type EntitlementStatus = 'scheduled' | 'pending_to_schedule';

export interface EntitlementsInfo {
  maxRescheduleDate: string;
  minRescheduleDate: string;
  maxReschedules: number;
  status: EntitlementStatus;
  usedReschedules: number;
}
