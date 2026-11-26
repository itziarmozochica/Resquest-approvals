import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface EnterInventoryFromPlanCreationData {
  event_type: string;
  plan_id: number;
}

export const enterInventoryFromPlanCreation = defineEvent<EnterInventoryFromPlanCreationData>('enter.inventoryFromPlanCreation');
