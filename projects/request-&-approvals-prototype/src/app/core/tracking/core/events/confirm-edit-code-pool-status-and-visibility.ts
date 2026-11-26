import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ConfirmEditCodePoolStatusAndVisibilityData {
  plan_id: number;
  code_pool_id: number | string;
  new_sold_out_status?: boolean;
  new_is_hidden_status?: boolean;
}

export class ConfirmEditCodePoolStatusAndVisibilityEvent extends TrackingEvent<ConfirmEditCodePoolStatusAndVisibilityData> {
  constructor(readonly data: ConfirmEditCodePoolStatusAndVisibilityData) {
    super(TrackingEvents.ConfirmEditCodePoolStatusAndVisibility, data);
  }
}
