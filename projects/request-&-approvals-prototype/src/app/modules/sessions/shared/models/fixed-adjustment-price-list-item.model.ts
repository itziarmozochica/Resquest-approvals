import { Money } from '../../../../shared/models/money.model';
import {
  PercentagePackedSessionTypeFare,
  PercentagePackedSessionTypeFareDTO,
  PercentagePackedSessionTypeFareUpdateDTO,
} from './percentage-price-list-item.model';
import {
  // BasePackedSessionTypeFare,
  // BasePackedSessionTypeFareDTO,
  // BasePackedSessionTypeFareUpdateDTO,
  BaseSpecifiedPriceListItemRule,
  MoneyDTO,
  PricingType,
  SpecifiedPriceListItemRuleDTO,
} from './price-list-item.model';

// TODO: Check whether the fixed adjustment rule will have it's own breakdown definition or will be the same
// as the percentage rule

// interface FixedAdjustmentFieldsDTO {
//   ticket_price_increment: number;
//   ticket_price_tax_base_increment: number;
// }

interface FixedAdjustmentMoneyFieldsDTO {
  ticket_price_increment: MoneyDTO;
  ticket_price_tax_base_increment: MoneyDTO;
}

// export type FixedAdjustmentPackedSessionTypeFareDTO = BasePackedSessionTypeFareDTO & FixedAdjustmentFieldsDTO;
// export type FixedAdjustmentPackedSessionTypeFareUpdateDTO = BasePackedSessionTypeFareUpdateDTO & FixedAdjustmentFieldsDTO;

export interface FixedAdjustmentPriceListItemRuleDTO extends SpecifiedPriceListItemRuleDTO, FixedAdjustmentMoneyFieldsDTO {
  pricing_type: PricingType.FixedAdjustment;
  pack_fare_breakdown_definition?: Array<PercentagePackedSessionTypeFareDTO>;
  parent_price_list_item_id?: string | null;
}

export interface FixedAdjustmentPriceListItemRuleUpdateDTO
  extends Omit<FixedAdjustmentPriceListItemRuleDTO, 'pack_fare_breakdown_definition'> {
  pack_fare_breakdown_definition?: Array<PercentagePackedSessionTypeFareUpdateDTO>;
}

export interface FixedAdjustmentMoneyFields {
  ticketPriceIncrement: Money;
  ticketPriceTaxBaseIncrement: Money;
}

export interface FixedAdjustmentFields {
  ticketPriceIncrement: number;
  ticketPriceTaxBaseIncrement: number;
}

// export type FixedAdjustmentPackedSessionTypeFare = BasePackedSessionTypeFare & FixedAdjustmentFields;

export interface FixedAdjustmentPriceListItemRule extends BaseSpecifiedPriceListItemRule, FixedAdjustmentMoneyFields {
  pricingType: PricingType.FixedAdjustment;
  packFareBreakdownDefinition?: Array<PercentagePackedSessionTypeFare>;
  // null inherits from the same ticket in the parent list; an id inherits from that item in this list
  parentPriceListItemId?: string | null;
}
