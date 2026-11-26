import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import { StandardSetup } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan_types/standard/standard-setup';
import { CardItem, SetupProvider } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan-setup.model';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';

export class ShowcaseSetup implements SetupProvider {
  readonly #standardSetup = new StandardSetup();

  shouldShowInventory = true;

  getInventoryCardItems(input: Parameters<NonNullable<SetupProvider['getInventoryCardItems']>>[0]): CardItem[] {
    const hasAnyCatalogSessionType = input.inventory?.sessionTypes?.some(st => st.borrowedFromCatalogMainPlan === true) ?? false;
    return [{ completed: hasAnyCatalogSessionType, label: 'planSetup.inventory.items.products' }];
  }

  getSettingsCardItems(plan: PlanCreationStatusData<Partial<MainPlanSettings> | null> | null): CardItem[] {
    return this.#standardSetup.getSettingsCardItems(plan);
  }
}
