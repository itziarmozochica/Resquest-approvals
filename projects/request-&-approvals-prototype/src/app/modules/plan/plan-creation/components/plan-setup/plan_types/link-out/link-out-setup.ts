import { LinkOutSettings } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/link-out/link-out-settings.model';
import { CardItem, SetupProvider } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/plan-setup.model';
import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';

interface SettingsCompletion {
  eventSettings: boolean;
}

export class LinkOutSetup implements SetupProvider {
  shouldShowInventory = false;

  getSettingsCardItems(plan: PlanCreationStatusData<LinkOutSettings> | null): CardItem[] {
    const settingsCompletion = this.#calculateSettingsCompletion(plan);

    return [{ label: 'planSetup.settings.items.event', completed: settingsCompletion.eventSettings, optional: false }];
  }

  #calculateSettingsCompletion(plan: PlanCreationStatusData<LinkOutSettings> | null): SettingsCompletion {
    if (!plan || !plan.planTypeSettings) {
      return { eventSettings: false };
    }

    const { endsAt, startsAt, ticketPrice, linkOuts } = plan.planTypeSettings;

    const hasRequiredDates = endsAt !== null && startsAt !== null;
    const hasTicketPrice = ticketPrice !== null;
    const hasValidLinkOuts = Array.isArray(linkOuts) && linkOuts.some(lo => lo.channelId === null && lo.language === null);

    const eventSettings = hasRequiredDates && hasTicketPrice && hasValidLinkOuts;

    return { eventSettings };
  }
}
