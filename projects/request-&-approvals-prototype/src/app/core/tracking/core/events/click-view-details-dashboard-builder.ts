import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export const ClickViewDetailsDashboardBuilderItemType = {
  chart: 'chart',
  dashboard: 'dashboard',
} as const;

export type ClickViewDetailsDashboardBuilderItemTypeET =
  (typeof ClickViewDetailsDashboardBuilderItemType)[keyof typeof ClickViewDetailsDashboardBuilderItemType];

export interface ClickViewDetailsDashboardBuilderData {
  item_id: number;
  item_type: ClickViewDetailsDashboardBuilderItemTypeET;
}

export class ClickViewDetailsDashboardBuilderEvent extends TrackingEvent<ClickViewDetailsDashboardBuilderData> {
  constructor(readonly data: ClickViewDetailsDashboardBuilderData) {
    super(TrackingEvents.ClickViewDetailsDashboardBuilder, data);
  }
}
