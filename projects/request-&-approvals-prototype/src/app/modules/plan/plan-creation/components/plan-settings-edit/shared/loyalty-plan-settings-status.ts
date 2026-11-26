export const LoyaltyPlanSettingsStatus = {
  Active: 'active',
  Cancelled: 'cancelled',
  Closed: 'closed',
  Resolved: 'resolved',
  WinnerSelected: 'winner_selected',
} as const;

export type LoyaltyPlanSettingsPlanType = 'auction' | 'prizeDraw';

export type LoyaltyPlanSettingsStatus = (typeof LoyaltyPlanSettingsStatus)[keyof typeof LoyaltyPlanSettingsStatus];

export interface PlanSettingsEditability {
  anyField: boolean;
  eventDates: boolean;
  scheduleEndDate: boolean;
  scheduleStartDate: boolean;
}

const READ_ONLY_EDITABILITY: PlanSettingsEditability = {
  anyField: false,
  eventDates: false,
  scheduleEndDate: false,
  scheduleStartDate: false,
};

const isCancelled = (status: string | null): boolean => status === LoyaltyPlanSettingsStatus.Cancelled;

const isActive = (status: string | null): boolean => status === LoyaltyPlanSettingsStatus.Active;

const isEventOnlyEditable = (status: string | null): boolean =>
  status === LoyaltyPlanSettingsStatus.Closed ||
  status === LoyaltyPlanSettingsStatus.Resolved ||
  status === LoyaltyPlanSettingsStatus.WinnerSelected;

export function getPlanSettingsStatusBannerKey(
  planType: LoyaltyPlanSettingsPlanType,
  status: string | null,
  hasStarted: boolean = true,
): string | null {
  if (status === LoyaltyPlanSettingsStatus.Active) {
    return hasStarted ? `planSettings.${planType}.statusBanner.active` : null;
  }

  if (status === LoyaltyPlanSettingsStatus.Cancelled) {
    return `planSettings.${planType}.statusBanner.cancelled`;
  }

  if (isEventOnlyEditable(status)) {
    return `planSettings.${planType}.statusBanner.closed`;
  }

  return null;
}

export function getPlanSettingsEditability(
  canEditPlan: boolean,
  status: string | null,
  hasStarted: boolean = true,
): PlanSettingsEditability {
  if (!canEditPlan || isCancelled(status)) {
    return READ_ONLY_EDITABILITY;
  }

  return {
    anyField: true,
    eventDates: true,
    scheduleEndDate: !isEventOnlyEditable(status),
    scheduleStartDate: !isEventOnlyEditable(status) && !(isActive(status) && hasStarted),
  };
}
