import { ClickGetDeliveryNoteSourceEnum } from '../../../../modules/reservation/models/click-get-delivery-note-source.enum';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickGetDeliveryNoteData {
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  reservation_id: string;
  reservation_locator: string;
  source: ClickGetDeliveryNoteSourceEnum;
  channel: string;
  business_type?: string;
  obo_flow_type?: string;
}

export class ClickGetDeliveryNoteEvent extends TrackingEvent<ClickGetDeliveryNoteData> {
  constructor(readonly data: ClickGetDeliveryNoteData) {
    super(TrackingEvents.ClickGetDeliveryNote, data);
  }
}
