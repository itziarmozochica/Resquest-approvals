import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { PlanSetupCardKey } from '../models/plan-tracking.model';

export interface ClickPlanSetupCardData {
  card: PlanSetupCardKey;
  plan_id: number;
}

export const clickPlanSetupCard = defineEvent<ClickPlanSetupCardData>('click.planSetupCard');
