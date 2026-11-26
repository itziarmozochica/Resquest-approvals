import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ClickPlanCreationSaveDraftData {
  plan_id: number;
  tab: string;
}

export const clickPlanCreationSaveDraft = defineEvent<ClickPlanCreationSaveDraftData>('click.planCreationSaveDraft');
