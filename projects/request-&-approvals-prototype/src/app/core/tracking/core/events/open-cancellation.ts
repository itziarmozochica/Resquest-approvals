import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface OpenCancellationData {
  order: number;
}
export class OpenCancellationEvent extends TrackingEvent<OpenCancellationData> {
  constructor(readonly data: OpenCancellationData) {
    super(TrackingEvents.OpenCancellation, data);
  }
}
