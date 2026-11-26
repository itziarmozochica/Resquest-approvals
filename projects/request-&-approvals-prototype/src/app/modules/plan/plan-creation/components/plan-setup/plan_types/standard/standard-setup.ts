import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import { CardItem, SetupProvider } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan-setup.model';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';

interface SettingsCompletion {
  mainSettings: boolean;
  otherSettings: boolean;
}

export class StandardSetup implements SetupProvider {
  shouldShowInventory = true;

  getSettingsCardItems(plan: PlanCreationStatusData<Partial<MainPlanSettings> | null> | null): CardItem[] {
    const settingsCompletion = this.#calculateSettingsCompletion(plan);

    return [
      { label: 'planSetup.settings.items.main', completed: settingsCompletion.mainSettings, optional: false },
      { label: 'planSetup.settings.items.other', completed: settingsCompletion.otherSettings, optional: true },
    ];
  }

  #calculateSettingsCompletion(plan: PlanCreationStatusData<Partial<MainPlanSettings> | null> | null): SettingsCompletion {
    if (!plan) {
      return { mainSettings: false, otherSettings: false };
    }

    const mainSettings = plan.planTypeSettings?.validationMethod != null;
    const otherSettings = true;

    return { mainSettings, otherSettings };
  }
}
