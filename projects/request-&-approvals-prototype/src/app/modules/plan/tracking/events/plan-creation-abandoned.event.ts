import { defineEvent } from '@fz/fz-tracking/src/public-api';

import type { CreateEventFlow, PlanCreationAbandonStep } from '../models/plan-tracking.model';

export interface PlanCreationAbandonedData {
  creationFlow: CreateEventFlow;
  lastStepReached: PlanCreationAbandonStep;
  planId?: number;
}

export const planCreationAbandoned = defineEvent<PlanCreationAbandonedData>('planCreation.abandoned');
