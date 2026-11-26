import { Type } from '@angular/core';

import { AuctionSettingsComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/plan_types/auction-settings/auction-settings.component';
import { LinkOutSettingsComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/plan_types/link-out-settings/link-out-settings.component';
import { PrizeDrawSettingsComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/plan_types/prize-draw-settings/prize-draw-settings.component';
import { StandardSettingsComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/plan_types/standard-settings/standard-settings.component';
import { WaitlistSettingsComponent } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/plan_types/waitlist-settings/waitlist-settings.component';

import { PlanType } from '../../../../event-settings/models/general-section.enum';

const PLAN_SETTINGS_COMPONENTS: Record<PlanType, Type<unknown>> = {
  [PlanType.auction]: AuctionSettingsComponent,
  [PlanType.deposit]: StandardSettingsComponent,
  [PlanType.giftCard]: StandardSettingsComponent,
  [PlanType.giveaway]: StandardSettingsComponent,
  [PlanType.growth]: StandardSettingsComponent,
  [PlanType.linkOut]: LinkOutSettingsComponent,
  [PlanType.movie]: StandardSettingsComponent,
  [PlanType.prizeDraw]: PrizeDrawSettingsComponent,
  [PlanType.redeemNow]: StandardSettingsComponent,
  [PlanType.showcase]: StandardSettingsComponent,
  [PlanType.standard]: StandardSettingsComponent,
  [PlanType.waitlist]: WaitlistSettingsComponent,
};

export function resolvePlanSettingsComponent(type: PlanType | null): Type<unknown> | null {
  if (!type) {
    return null;
  }
  return PLAN_SETTINGS_COMPONENTS[type] || null;
}

const PLAN_SETTINGS_COMPONENTS_WITH_OWN_TABS = new Set<Type<unknown>>([StandardSettingsComponent]);

export function hasOwnSettingsTabs(component: Type<unknown> | null): boolean {
  return component !== null && PLAN_SETTINGS_COMPONENTS_WITH_OWN_TABS.has(component);
}
