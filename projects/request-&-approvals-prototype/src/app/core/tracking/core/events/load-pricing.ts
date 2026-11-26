import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadPricingData {
  city_id: number;
  city_name: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  default_filter: boolean;
  has_results: boolean;
}

export class LoadPricingEvent extends TrackingEvent<LoadPricingData> {
  constructor(readonly data: LoadPricingData) {
    super(TrackingEvents.LoadPricing, data);
  }
}
