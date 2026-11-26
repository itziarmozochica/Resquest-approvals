import { TrackingGlobalProperties } from './tracking-context';
import { TrackingEvent } from './tracking-event';

export interface TrackingMapper<T extends TrackingEvent<any>, K> {
  map(event: T, global: TrackingGlobalProperties): K;
}
