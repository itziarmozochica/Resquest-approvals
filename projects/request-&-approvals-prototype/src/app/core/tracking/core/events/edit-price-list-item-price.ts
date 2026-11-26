import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface PackedSessionTypeFareData {
  session_type_id: number;
  price: number;
}

export interface PriceListItemData {
  previous_price: number | null;
  new_price: number | null;

  previous_price_increment: number | null;
  new_price_increment: number | null;

  previous_percentage_adjustment: number | null;
  new_percentage_adjustment: number | null;

  previous_strikethrough_price: number | null;
  new_strikethrough_price: number | null;

  previous_strikethrough_price_hint_hidden: boolean | null;
  new_strikethrough_price_hint_hidden: boolean | null;

  currency: string | null;

  fixed_surcharge_per_ticket: number | null;
  previous_fixed_surcharge_per_ticket: number | null;

  percentage_surcharge_per_ticket: number | null;
  previous_percentage_surcharge_per_ticket: number | null;

  previous_pack_fare_breakdown_definition?: PackedSessionTypeFareData[];
  current_pack_fare_breakdown_definition?: PackedSessionTypeFareData[];
}

export interface EditPriceListItemPriceData extends PriceListItemData {
  plan_id: number;
  price_list_id: string;
  price_list_name: string;
  session_type_id: number;
  session_type_name: string;
}

export class EditPriceListItemPriceEvent extends TrackingEvent<EditPriceListItemPriceData> {
  constructor(readonly data: EditPriceListItemPriceData) {
    super(TrackingEvents.EditPriceListItemPrice, data);
  }
}
