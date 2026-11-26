import { PrizeDrawSettings } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/prize-draw/prize-draw-settings.model';
import { CardItem, SetupProvider } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan-setup.model';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';

interface SettingsCompletion {
  eventSettings: boolean;
}

export class PrizeDrawSetup implements SetupProvider {
  shouldShowInventory = false;

  getSettingsCardItems(plan: PlanCreationStatusData<PrizeDrawSettings | null> | null): CardItem[] {
    const settingsCompletion = this.#calculateSettingsCompletion(plan);

    return [{ label: 'planSetup.settings.items.event', completed: settingsCompletion.eventSettings, optional: false }];
  }

  #calculateSettingsCompletion(plan: PlanCreationStatusData<PrizeDrawSettings | null> | null): SettingsCompletion {
    if (!plan) {
      return { eventSettings: false };
    }

    const eventSettings = !!plan.planTypeSettings;

    return { eventSettings };
  }
}
