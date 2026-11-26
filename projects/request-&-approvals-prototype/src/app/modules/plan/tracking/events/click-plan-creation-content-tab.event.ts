import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ClickPlanCreationContentTabData {
  plan_id: number;
  previous_tab: string;
  tab: string;
}

export const clickPlanCreationContentTab = defineEvent<ClickPlanCreationContentTabData>('click.planCreationContentTab');
