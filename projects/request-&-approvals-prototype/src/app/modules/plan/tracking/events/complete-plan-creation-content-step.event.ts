import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface CompletePlanCreationContentStepData {
  plan_id: number;
}

export const completePlanCreationContentStep = defineEvent<CompletePlanCreationContentStepData>('complete.planCreationContentStep');
