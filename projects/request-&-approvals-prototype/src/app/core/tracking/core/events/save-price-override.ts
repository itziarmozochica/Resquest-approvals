import { PackedSessionTypeFare } from '@fz-original/app/modules/sessions/shared/models/fixed-price-list-item.model';

import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface SavePriceOverrideEventData {
  plan_id: number;
  session_id: number;
  channel_id: string;
  previous_ticket_price: number;
  previous_surcharge_per_ticket: number;
  previous_ticket_price_tax_base: number;
  previous_surcharge_per_ticket_tax_base: number;
  previous_strikethrough_price?: number | null;
  previous_strikethrough_price_hint_hidden?: boolean | null;
  previous_pack_fare_breakdown_definition?: Array<PackedSessionTypeFare>;
  updated_ticket_price: number;
  updated_surcharge_per_ticket: number;
  updated_ticket_price_tax_base: number;
  updated_surcharge_per_ticket_tax_base: number;
  updated_strikethrough_price?: number | null;
  updated_strikethrough_price_hint_hidden?: boolean | null;
  updated_pack_fare_breakdown_definition?: Array<PackedSessionTypeFare>;
}

export class SavePriceOverrideEvent extends TrackingEvent<SavePriceOverrideEventData> {
  constructor(readonly data: SavePriceOverrideEventData) {
    super(TrackingEvents.SavePriceOverride, data);
  }
}
