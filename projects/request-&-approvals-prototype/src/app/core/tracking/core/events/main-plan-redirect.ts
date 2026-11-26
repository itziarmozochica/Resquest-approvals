import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

type MainPlanRedirectAction = 'save' | 'update' | 'delete';

interface MainPlanRedirectData {
  partner_id: number;
  plan_id: number;
  action: MainPlanRedirectAction;
  redirect_to_id?: number;
  previous_redirect_to_id?: number;
}

export class MainPlanRedirectEvent extends TrackingEvent<MainPlanRedirectData> {
  constructor(readonly data: MainPlanRedirectData) {
    super(TrackingEvents.MainPlanRedirect, data);
  }
}
