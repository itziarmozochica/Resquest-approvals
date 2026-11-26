import { SalesWindowConfig } from '@fz-original/app/modules/sessions/shared/components/sales-window/models/sales-window.model';
import { SessionActionRuleListItem, SessionActionRuleListItemDTO } from '@fz-original/app/modules/sessions/shared/models/action-rule.model';
import { SessionStatusEnum } from '@fz-original/app/shared/models/session/session-status.enum';

import { IdData } from '../data/data.model';
import { Money } from '../money.model';
import { SessionSalesSummary, SessionSalesSummaryData } from './session-sales-summary.model';

export interface CapacitySummaryBySessionData extends IdData<number> {
  label: string;
  startsAt: string;
  starts_at: string;
  ends_at: string;
  expires_at: string;
  has_seating: boolean;
  is_hidden: boolean;
  code_pool_id: number;
  sold_tickets: number;
  capacity: number;
  available_tickets: number;
  occupancy: number;
  ticket_price: Money | null;
  is_sold_out: boolean;
  is_expired: boolean;
  has_price_list_pricing: boolean;
  ignore_time_slot_capacity: boolean;
  use_for_availability: boolean;
  reserved_unpaid_tickets: number;
  blocked_tickets: number;
  is_add_on: boolean;
  is_pack: boolean;
  session_sales_summaries: SessionSalesSummaryData[] | null;
  incoming_rules: SessionActionRuleListItemDTO[] | null;
  outgoing_rules: SessionActionRuleListItemDTO[] | null;
  ticket_price_tax_base?: Money;
}

export class CapacitySummaryBySession {
  constructor(
    public id: number,
    public label: string,
    public startsAt: string,
    public endsAt: string,
    public expiresAt: string,
    public hasSeating: boolean,
    public isHidden: boolean,
    public codePoolId: number | null = null,
    public soldTickets: number,
    public capacity: number,
    public availableTickets: number,
    public occupancy: number,
    public ticketPrice: Money | null,
    public isSoldOut: boolean,
    public isExpired: boolean,
    public hasPriceListPricing: boolean,
    public ignoreTimeSlotCapacity: boolean,
    public useForAvailability: boolean,
    public reservedUnpaidTickets: number,
    public blockedTickets: number,
    public isAddOn: boolean,
    public isPack: boolean,
    public sessionSalesSummaries: SessionSalesSummary[] | null,
    public capacityGroupId: string | null,
    public incomingRules: SessionActionRuleListItem[] | null,
    public outgoingRules: SessionActionRuleListItem[] | null,
    public ticketPriceTaxBase: Money | null = null,
    public status: SessionStatusEnum | null = null,
    public salesWindows: SalesWindowConfig | null = null,
  ) {}
}
