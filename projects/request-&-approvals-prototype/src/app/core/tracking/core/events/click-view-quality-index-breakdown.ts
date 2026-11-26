import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickViewQualityIndexBreakdownData {
  plan_id: number;
  quality_index: number;
}

export class ClickViewQualityIndexBreakdownEvent extends TrackingEvent<ClickViewQualityIndexBreakdownData> {
  constructor(readonly data: ClickViewQualityIndexBreakdownData) {
    super(TrackingEvents.ClickViewQualityIndexBreakdown, data);
  }
}
