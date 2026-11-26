import { ClickKioskPlanDetailEvent } from '../../core/events/click-kiosk-plan-detail';
import { MixpanelEvent } from '../../providers/mixpanel/mixpanel-event';
import { MixpanelTrackingMapper } from '../../providers/mixpanel/mixpanel-mapper';

export class ClickKioskPlanDetailMapper implements MixpanelTrackingMapper<ClickKioskPlanDetailEvent> {
  map(event: ClickKioskPlanDetailEvent): MixpanelEvent {
    return new MixpanelEvent('click_kiosk_plan_detail', event.data);
  }
}
