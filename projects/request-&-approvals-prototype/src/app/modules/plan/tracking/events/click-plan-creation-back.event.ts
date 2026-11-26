import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ClickPlanCreationBackData {
  plan_id: number;
  tab: string;
}

export const clickPlanCreationBack = defineEvent<ClickPlanCreationBackData>('click.planCreationBack');
