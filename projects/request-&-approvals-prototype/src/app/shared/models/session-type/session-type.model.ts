import { AddOnCategory } from '../../services/sessions/session-type.model';
import { ReservationRestrictionEnum } from './reservation-restriction.enum';

export interface SessionTypeAddOnConfiguration {
  category?: AddOnCategory;
  pricingType?: string;
}

export interface SessionTypeAddOnConfigurationData {
  category?: AddOnCategory;
  pricing_type: string;
  selector_type?: string;
}

export interface SessionTypeData {
  id: number;
  add_on_configuration?: SessionTypeAddOnConfigurationData;
  label?: string;
  is_pass?: boolean;
  is_add_on?: boolean;
  reservation_restriction?: ReservationRestrictionEnum;
  ticket_receipt_label?: string;
  ignore_time_slot_capacity?: boolean;
  allowed_num_tickets?: {
    minimum: number;
    maximum: number;
  };
  is_shop_product?: boolean;
  is_timeless?: boolean;
  ticket_selector_step_quantity?: number;
  image_url?: string;
  // Tag palette token the backend resolves from the session type's tags.
  color?: string | null;
}

export class SessionType {
  constructor(
    public id: number,
    public label?: string,
    public isPass?: boolean,
    public isAddOn?: boolean,
    public reservationRestriction?: ReservationRestrictionEnum,
    public ticketReceiptLabel?: string,
    public ignoreTimeSlotCapacity?: boolean,
    public minimumTicketsAllowed?: number,
    public maximumTicketsAllowed?: number,
    public isShopProduct?: boolean,
    public isEntryPass?: boolean,
    public ticketSelectorStepQuantity?: number,
    public isTimeless?: boolean,
    public imageUrl?: string,
    // Hex of the backend-resolved `color` (`sessionTypeTileColor`), painted only behind `session_type_colors`.
    public tileColor?: string,
  ) {}

  addOnConfiguration?: SessionTypeAddOnConfiguration;
}
