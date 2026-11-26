import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface PosConfigDeviceChangedData {
  fromDeviceId: string | null;
  toDeviceId: string;
}

export const posConfigDeviceChanged = defineEvent<PosConfigDeviceChangedData>('pos.config.device.changed');
