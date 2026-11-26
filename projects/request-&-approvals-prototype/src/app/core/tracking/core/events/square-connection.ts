import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SquareConnectionData {
  plan_id: number;
  device_id: string;
  connected: boolean;
}

export class SquareConnectionEvent extends TrackingEvent<SquareConnectionData> {
  constructor(readonly data: SquareConnectionData) {
    super(TrackingEvents.SquareConnection, data);
  }
}
