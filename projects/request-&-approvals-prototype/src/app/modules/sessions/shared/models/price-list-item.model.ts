import { Money } from '../../../../shared/models/money.model';
import { AddOnCategory, isAddOnCategory } from '../../../../shared/services/sessions/add-on-category.enum';
import {
  FixedAdjustmentPriceListItemRule,
  FixedAdjustmentPriceListItemRuleDTO,
  FixedAdjustmentPriceListItemRuleUpdateDTO,
} from './fixed-adjustment-price-list-item.model';
import {
  FixedOverridePriceListItemRule,
  FixedOverridePriceListItemRuleDTO,
  FixedOverridePriceListItemRuleUpdateDTO,
  PackedSessionTypeFare,
} from './fixed-price-list-item.model';
import {
  PercentageOverridePriceListItemRule,
  PercentageOverridePriceListItemRuleDTO,
  PercentageOverridePriceListItemRuleUpdateDTO,
  PercentagePackedSessionTypeFare,
} from './percentage-price-list-item.model';

export interface SessionTypeGroupDTO {
  id: number;
  name: string;
}

export const AddOnPricingType = {
  PercentageOverBasePrice: 'percentage_over_base_price',
} as const;

export type AddOnPricingTypeET = (typeof AddOnPricingType)[keyof typeof AddOnPricingType];

export interface AddOnConfigurationDTO {
  category?: string;
  pricing_type?: string;
}

export interface AddOnConfiguration {
  category?: AddOnCategory;
  pricingType?: string;
}

export function mapAddOnConfiguration(dto: AddOnConfigurationDTO | undefined): AddOnConfiguration | undefined {
  return dto ? { category: isAddOnCategory(dto.category) ? dto.category : undefined, pricingType: dto.pricing_type } : undefined;
}

export function isPercentageOverBasePriceAddOn(sessionType: { addOnConfiguration?: AddOnConfiguration } | undefined): boolean {
  return sessionType?.addOnConfiguration?.pricingType === AddOnPricingType.PercentageOverBasePrice;
}

export interface SessionTypeDTO {
  id: number;
  label: string;
  groups: Array<SessionTypeGroupDTO>;
  add_on_configuration?: AddOnConfigurationDTO;
}

export type MoneyDTO = Pick<Money, 'amount' | 'currency'>;

export enum PricingType {
  Unspecified = 'unspecified',
  FixedOverride = 'fixed_override',
  FixedAdjustment = 'fixed_adjustment',
  PercentageAdjustment = 'percentage_adjustment',
}

export interface BasePackedSessionTypeFareDTO {
  session_type: Omit<SessionTypeDTO, 'groups'>;
}

export interface BasePackedSessionTypeFareUpdateDTO {
  session_type_id: number;
}

export enum StrikethroughDefinitionType {
  FixedAdjustment = 'fixed_adjustment',
  FixedAmount = 'fixed_amount',
  ParentTicketPrice = 'parent_ticket_price',
  PercentageAdjustment = 'percentage_adjustment',
}

export interface StrikethroughDefinitionDTO {
  hint_hidden: boolean;
  type: StrikethroughDefinitionType;
  amount?: number;
  percentage?: number;
}

export interface ParentTicketPriceStrikethroughDefinition {
  hintHidden: boolean;
  type: StrikethroughDefinitionType.ParentTicketPrice;
}

export interface AmountStrikethroughDefinition {
  amount: number;
  hintHidden: boolean;
  type: StrikethroughDefinitionType.FixedAdjustment | StrikethroughDefinitionType.FixedAmount;
}

export interface PercentageStrikethroughDefinition {
  hintHidden: boolean;
  percentage: number;
  type: StrikethroughDefinitionType.PercentageAdjustment;
}

export type StrikethroughDefinition =
  | AmountStrikethroughDefinition
  | ParentTicketPriceStrikethroughDefinition
  | PercentageStrikethroughDefinition;

// The API requires factor_set_id on write; the drawer only offers scaling once it knows the plan's factor set.
// The limits come back both as factors and as the prices they sell at. The drawer only reads and sends the prices, which
// the API turns into factors, so the factors can go once nothing else reads them
export interface MlScaledConfigurationDTO {
  factor_breakpoints?: number[] | null;
  factor_set_id?: number;
  max_factor?: number | null;
  max_price?: number | null;
  min_factor?: number | null;
  min_price?: number | null;
  price_breakpoints?: number[] | null;
}

export interface MlScaledConfiguration {
  factorSetId: number | null;
  // True as the API returned it: a save leaves it out, so the API keeps it and its limits keep following the price
  isStored: boolean;
  maxPrice: number | null;
  minPrice: number | null;
  priceBreakpoints: number[] | null;
}

export interface BasePriceListItemRuleDTO {
  must_use_tax_base: boolean;
  tax_product_rate: number;
  tax_surcharge_rate: number;
}

export interface UnspecifiedPriceListItemRuleDTO extends BasePriceListItemRuleDTO {
  pricing_type: PricingType.Unspecified;
}

export interface SpecifiedPriceListItemRuleDTO extends BasePriceListItemRuleDTO {
  pricing_type: PricingType;
  fixed_surcharge_per_ticket: MoneyDTO;
  fixed_surcharge_per_ticket_tax_base: MoneyDTO;
  percentage_surcharge_per_ticket: number | null;
  strikethrough_price: MoneyDTO | null;
  b2b_discount_percentage?: number | null;
  strikethrough_definition?: StrikethroughDefinitionDTO | null;
  strikethrough_price_hint_hidden?: boolean | null;
  wholesale_ticket_price?: MoneyDTO | null;
}

export type PriceListItemRuleDTO =
  | UnspecifiedPriceListItemRuleDTO
  | FixedOverridePriceListItemRuleDTO
  | PercentageOverridePriceListItemRuleDTO
  | FixedAdjustmentPriceListItemRuleDTO;

export type PriceListItemRuleUpdateDTO =
  | FixedOverridePriceListItemRuleUpdateDTO
  | PercentageOverridePriceListItemRuleUpdateDTO
  | FixedAdjustmentPriceListItemRuleUpdateDTO;

export interface ProductTaxRateDTO {
  id: string;
  product_type: string;
  national_tax_name: string | null;
  national_tax_product_rate: number;
  national_tax_surcharge_rate: number;
  local_tax_name: string | null;
  local_tax_product_rate: number;
  local_tax_surcharge_rate: number;
}

export interface PriceListItemDTO {
  id: string;
  session_type: SessionTypeDTO;
  target_tiers: Array<number> | null;
  rule: PriceListItemRuleDTO;
  product_tax_rate: ProductTaxRateDTO;
}

export interface PriceListItemUpdateDTO {
  id: string;
  session_type_id: number;
  target_tiers: Array<number> | null;
  rule: PriceListItemRuleUpdateDTO;
  /**
   * @deprecated Time-based prices (variants) have been removed from the frontend.
   * This field is kept for backward compatibility with the API and should always be an empty array.
   */
  readonly variants: readonly [];
}

export interface SessionType {
  id: number;
  label: string;
  groups: Array<SessionTypeGroupDTO>;
  addOnConfiguration?: AddOnConfiguration;
}

export interface BasePackedSessionTypeFare {
  sessionTypeId: number;
}

export interface BasePriceListItemRule {
  pricingType: PricingType;
  mustUseTaxBase: boolean;
  taxProductRate: number;
  taxSurchargeRate: number;
}

export interface UnspecifiedPriceListItemRule extends BasePriceListItemRule {
  pricingType: PricingType.Unspecified;
}

export interface BaseSpecifiedPriceListItemRule extends BasePriceListItemRule {
  b2bDiscountPercentage: number | null;
  pricingType: PricingType;
  percentageSurchargePerTicket: number | null;
  fixedSurchargePerTicket: Money;
  fixedSurchargePerTicketTaxBase: Money;
  // undefined when the API has no definition of its own, or only mirrors the legacy strikethroughPrice: the save then omits it
  strikethroughDefinition?: StrikethroughDefinition | null;
  strikethroughPrice?: Money | null;
  strikethroughPriceHintHidden?: boolean | null;
  wholesaleTicketPrice?: Money | null;
}

export type PriceListItemRule =
  | UnspecifiedPriceListItemRule
  | FixedOverridePriceListItemRule
  | PercentageOverridePriceListItemRule
  | FixedAdjustmentPriceListItemRule;

export type SpecifiedPriceListItemRule =
  | FixedOverridePriceListItemRule
  | PercentageOverridePriceListItemRule
  | FixedAdjustmentPriceListItemRule;

export type SpecifiedPackBreakDownDefinition = Array<PackedSessionTypeFare> | Array<PercentagePackedSessionTypeFare>;

export interface ProductTaxRate {
  id: string;
  productType: string;
  nationalTaxName: string | null;
  nationalTaxProductRate: number;
  nationalTaxSurchargeRate: number;
  localTaxName: string | null;
  localTaxProductRate: number;
  localTaxSurchargeRate: number;
}

export interface PriceListItem {
  id: string;
  sessionType: SessionType;
  targetTiers?: Array<number>;
  rule: PriceListItemRule;
  productTaxRate?: ProductTaxRate;
}
