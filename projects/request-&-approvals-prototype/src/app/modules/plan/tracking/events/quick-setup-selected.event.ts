import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface QuickSetupSelectedData {
  event_type: string;
}

export const quickSetupSelected = defineEvent<QuickSetupSelectedData>('quickSetup.selected');
