import { PlanType } from '../models/general-section.enum';

const PLAN_TYPES_WITHOUT_EXTERNAL_PLATFORMS: PlanType[] = [PlanType.redeemNow];

export function shouldShowExternalPlatformsForPlanType(planType: PlanType | undefined): boolean {
  if (!planType) {
    return true;
  }

  return !PLAN_TYPES_WITHOUT_EXTERNAL_PLATFORMS.includes(planType);
}
