import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface PartnerCreatesCustomCapabilitySettingsData {
  partner_id: number;
  business_type: string;
}

export class PartnerCreatesCustomCapabilitySettingsEvent extends TrackingEvent<PartnerCreatesCustomCapabilitySettingsData> {
  constructor(readonly data: PartnerCreatesCustomCapabilitySettingsData) {
    super(TrackingEvents.PartnerCreatesCustomCapabilitySettings, data);
  }
}
