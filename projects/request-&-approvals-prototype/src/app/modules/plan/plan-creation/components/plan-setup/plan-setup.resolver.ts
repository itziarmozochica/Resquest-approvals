import { PlanType } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { AuctionSetup } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan_types/auction/auction-setup';
import { LinkOutSetup } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan_types/link-out/link-out-setup';
import { PrizeDrawSetup } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan_types/prize-draw/prize-draw-setup';
import { ShowcaseSetup } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan_types/showcase/showcase-setup';
import { StandardSetup } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan_types/standard/standard-setup';
import { WaitlistSetup } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan_types/waitlist/waitlist-setup';
import { SetupProvider } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan-setup.model';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';

const PLAN_SETUP_PROVIDERS: Record<string, SetupProvider> = {
  [PlanType.auction]: new AuctionSetup(),
  [PlanType.linkOut]: new LinkOutSetup(),
  [PlanType.prizeDraw]: new PrizeDrawSetup(),
  [PlanType.showcase]: new ShowcaseSetup(),
  [PlanType.standard]: new StandardSetup(),
  [PlanType.waitlist]: new WaitlistSetup(),
};

export function resolveSetupProvider(plan: PlanCreationStatusData | null): SetupProvider | null {
  if (!plan?.type) {
    return null;
  }

  const setupProvider = PLAN_SETUP_PROVIDERS[plan.type];
  if (setupProvider) {
    return setupProvider;
  }

  return new StandardSetup();
}
