import {
  BasePackedSessionTypeFare,
  BasePackedSessionTypeFareDTO,
  BasePackedSessionTypeFareUpdateDTO,
  BaseSpecifiedPriceListItemRule,
  PricingType,
  SpecifiedPriceListItemRuleDTO,
} from './price-list-item.model';

interface PercentageAdjustmentFieldsDTO {
  percentage_increment: number;
}

interface PercentageAdjustmentBreakDownFieldsDTO {
  percentage: number;
}

export type PercentagePackedSessionTypeFareDTO = BasePackedSessionTypeFareDTO & PercentageAdjustmentBreakDownFieldsDTO;
export type PercentagePackedSessionTypeFareUpdateDTO = BasePackedSessionTypeFareUpdateDTO & PercentageAdjustmentBreakDownFieldsDTO;

export interface PercentageOverridePriceListItemRuleDTO extends SpecifiedPriceListItemRuleDTO, PercentageAdjustmentFieldsDTO {
  pricing_type: PricingType.PercentageAdjustment;
  pack_fare_breakdown_definition?: Array<PercentagePackedSessionTypeFareDTO>;
  parent_price_list_item_id?: string | null;
}

export interface PercentageOverridePriceListItemRuleUpdateDTO
  extends Omit<PercentageOverridePriceListItemRuleDTO, 'pack_fare_breakdown_definition'> {
  pack_fare_breakdown_definition?: Array<PercentagePackedSessionTypeFareUpdateDTO>;
}

export interface PercentageAdjustmentFields {
  percentageIncrement: number;
}

type PercentageAdjustmentBreakDownFields = PercentageAdjustmentBreakDownFieldsDTO;

export type PercentagePackedSessionTypeFare = BasePackedSessionTypeFare & PercentageAdjustmentBreakDownFields;

export interface PercentageOverridePriceListItemRule extends BaseSpecifiedPriceListItemRule, PercentageAdjustmentFields {
  pricingType: PricingType.PercentageAdjustment;
  packFareBreakdownDefinition?: Array<PercentagePackedSessionTypeFare>;
  // null inherits from the same ticket in the parent list; an id inherits from that item in this list
  parentPriceListItemId?: string | null;
}
