import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ClickPlanCreationContinueData {
  plan_id: number;
  tab: string;
}

export const clickPlanCreationContinue = defineEvent<ClickPlanCreationContinueData>('click.planCreationContinue');
