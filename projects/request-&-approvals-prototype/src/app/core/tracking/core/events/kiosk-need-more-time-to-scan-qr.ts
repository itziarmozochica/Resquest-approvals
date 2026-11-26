import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface KioskNeedMoreTimeToScanQRData {
  order_id: number;
  plan_id: number;
}

export class KioskNeedMoreTimeToScanQREvent extends TrackingEvent<KioskNeedMoreTimeToScanQRData> {
  constructor(readonly data: KioskNeedMoreTimeToScanQRData) {
    super(TrackingEvents.KioskNeedMoreTimeToScanQR, data);
  }
}
