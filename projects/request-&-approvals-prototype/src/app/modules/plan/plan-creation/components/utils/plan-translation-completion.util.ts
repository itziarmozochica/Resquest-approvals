import { CardItem } from '../plan-setup/plan-setup.model';

export function buildPlanTranslationSetupCardItem(complete: boolean): CardItem {
  return {
    label: 'planSetup.content.items.translation',
    completed: complete,
    optional: true,
    permission: 'can_manage_main_plan_translations',
  };
}
