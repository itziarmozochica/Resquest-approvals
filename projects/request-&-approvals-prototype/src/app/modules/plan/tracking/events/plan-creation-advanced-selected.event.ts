import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PlanCreationAdvancedSelectedData {
  event_type: string;
}

export const planCreationAdvancedSelected = defineEvent<PlanCreationAdvancedSelectedData>('planCreation.advancedSelected');
