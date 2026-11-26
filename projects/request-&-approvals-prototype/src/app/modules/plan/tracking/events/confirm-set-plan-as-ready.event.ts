import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ConfirmSetPlanAsReadyData {
  plan_id: number;
}

export const confirmSetPlanAsReady = defineEvent<ConfirmSetPlanAsReadyData>('confirm.setPlanAsReady');
