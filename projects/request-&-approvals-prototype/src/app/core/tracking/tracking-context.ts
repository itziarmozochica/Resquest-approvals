import { TrackingEvent } from './tracking-event';

export interface TrackingGlobalProperties {
  [key: string]: any;
}

export interface TrackingContext<T> {
  event: TrackingEvent<T>;
  include: Array<string>;
  exclude: Array<string>;
  global: TrackingGlobalProperties;
}
