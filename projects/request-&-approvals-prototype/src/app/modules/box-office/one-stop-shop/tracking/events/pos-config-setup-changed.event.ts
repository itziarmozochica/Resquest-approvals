import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosConfigSetupChangedData {
  fromSetupId: string | null;
  toSetupId: string;
}

export const posConfigSetupChanged = defineEvent<PosConfigSetupChangedData>('pos.config.setup.changed');
