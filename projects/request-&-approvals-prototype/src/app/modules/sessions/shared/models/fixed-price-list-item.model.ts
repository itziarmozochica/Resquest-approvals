import { Money } from '../../../../shared/models/money.model';
import {
  BasePackedSessionTypeFare,
  BasePackedSessionTypeFareDTO,
  BasePackedSessionTypeFareUpdateDTO,
  BaseSpecifiedPriceListItemRule,
  MlScaledConfiguration,
  MlScaledConfigurationDTO,
  MoneyDTO,
  PricingType,
  SpecifiedPriceListItemRuleDTO,
} from './price-list-item.model';
import { TaxBreakdown } from './session-type-pricing.model';

interface FixedOverrideFieldsDTO {
  ticket_price: number;
  ticket_price_tax_base: number;
}

interface FixedOverrideMoneyFieldsDTO {
  ticket_price: MoneyDTO;
  ticket_price_tax_base: MoneyDTO;
}

export type PackedSessionTypeFareDTO = BasePackedSessionTypeFareDTO & FixedOverrideFieldsDTO;
export type PackedSessionTypeFareUpdateDTO = BasePackedSessionTypeFareUpdateDTO & FixedOverrideFieldsDTO;

export interface FixedOverridePriceListItemRuleDTO extends SpecifiedPriceListItemRuleDTO, FixedOverrideMoneyFieldsDTO {
  pricing_type: PricingType.FixedOverride;
  ml_scaled_configuration?: MlScaledConfigurationDTO | null;
  pack_fare_breakdown_definition?: Array<PackedSessionTypeFareDTO>;
}

export interface FixedOverridePriceListItemRuleUpdateDTO extends Omit<FixedOverridePriceListItemRuleDTO, 'pack_fare_breakdown_definition'> {
  pack_fare_breakdown_definition?: Array<PackedSessionTypeFareUpdateDTO>;
}

export interface FixedOverrideMoneyFields {
  ticketPrice: Money;
  ticketPriceTaxBase: Money;
}

export interface FixedOverrideFields {
  ticketPrice: number;
  ticketPriceTaxBase: number;
}

export type PackedSessionTypeFare = BasePackedSessionTypeFare & FixedOverrideFields & { ticketPriceTaxBreakdown?: TaxBreakdown };

export interface FixedOverridePriceListItemRule extends BaseSpecifiedPriceListItemRule, FixedOverrideMoneyFields {
  pricingType: PricingType.FixedOverride;
  mlScaledConfiguration?: MlScaledConfiguration | null;
  packFareBreakdownDefinition?: Array<PackedSessionTypeFare>;
}
