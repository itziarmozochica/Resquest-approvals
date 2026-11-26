import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { PlanCreationStep } from '../models/plan-tracking.model';

export interface LoadPlanCreationData {
  content_progress: number;
  event_type: string;
  inventory_progress: number | null;
  plan_id: number;
  settings_progress: number;
  step: PlanCreationStep;
}

export const loadPlanCreation = defineEvent<LoadPlanCreationData>('load.planCreation');
