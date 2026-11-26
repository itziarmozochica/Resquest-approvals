import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { PlanCreationStep } from '../models/plan-tracking.model';

export interface ClickPlanCreationStepperData {
  current_step: PlanCreationStep;
  plan_id: number;
  step: PlanCreationStep;
}

export const clickPlanCreationStepper = defineEvent<ClickPlanCreationStepperData>('click.planCreationStepper');
