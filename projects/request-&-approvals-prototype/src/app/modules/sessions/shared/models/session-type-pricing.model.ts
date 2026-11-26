import { Money } from '../../../../shared/models/money.model';
import {
  AddOnConfiguration,
  AddOnConfigurationDTO,
  MoneyDTO,
  PriceListItemRule,
  PriceListItemRuleDTO,
  ProductTaxRate,
  ProductTaxRateDTO,
} from './price-list-item.model';

interface NamedItem<T> {
  id: T;
  name: string;
}

// --- DTO ---
type PriceTypePricingPriceListDTO = NamedItem<string>;
type SessionTypePricingGroupDTO = NamedItem<number>;

export interface PackedSessionTypeDTO {
  id: number;
  quantity: number;
}

export interface SessionTypeDTO {
  id: number;
  label: string;
  groups: Array<SessionTypePricingGroupDTO>;
  packed_session_types?: Array<PackedSessionTypeDTO>;
  add_on_configuration?: AddOnConfigurationDTO;
}

export interface TaxBreakdownDTO {
  product_type: string;
  national_tax_name: string | null;
  national_tax_rate: number;
  local_tax_name: string | null;
  local_tax_rate: number | null;
}

export interface PackFareBreakdownItemDTO {
  session_type: SessionTypeDTO;
  quantity: number;
  percentage: number;
  ticket_price: number;
  ticket_price_tax_base: number;
  ticket_price_tax_breakdown: TaxBreakdownDTO;
  surcharge_price: number;
  surcharge_price_tax_base: number;
  surcharge_price_tax_breakdown: TaxBreakdownDTO;
}

export interface PriceListItemDTO {
  id: string;
  price_list_id: string;
  session_type: SessionTypeDTO;
  target_tiers: Array<number> | null;
  rule: PriceListItemRuleDTO;
  product_tax_rate: ProductTaxRateDTO;
}

export interface SessionTypePricingDTO {
  ticket_price: MoneyDTO;
  ticket_price_tax_base: MoneyDTO;
  surcharge_price: MoneyDTO;
  surcharge_price_tax_base: MoneyDTO;
  pack_fare_breakdown: Array<PackFareBreakdownItemDTO> | null;
  price_list: PriceTypePricingPriceListDTO;
  price_list_item: PriceListItemDTO;
  children: Array<SessionTypePricingDTO>;
  // Always sent, null when customers see no strikethrough
  strikethrough_discount_percentage: number | null;
  strikethrough_price: MoneyDTO | null;
  strikethrough_price_hint_hidden: boolean | null;
}

// --- MODEL ---
export type PriceTypePricingPriceList = PriceTypePricingPriceListDTO;
type PackedSessionType = PackedSessionTypeDTO;
type SessionTypePricingGroup = SessionTypePricingGroupDTO;

export interface TaxBreakdown {
  productType: string;
  nationalTaxName: string | null;
  nationalTaxRate: number;
  localTaxName: string | null;
  localTaxRate: number | null;
}

export interface PackFareBreakdownItem {
  sessionType: SessionType;
  quantity: number;
  percentage: number;
  ticketPrice: number;
  ticketPriceTaxBase: number;
  ticketPriceTaxBreakdown: TaxBreakdown;
  surchargePrice: number;
  surchargePriceTaxBase: number;
  surchargePriceTaxBreakdown: TaxBreakdown;
}

export interface SessionType {
  id: number;
  label: string;
  groups: Array<SessionTypePricingGroup>;
  packedSessionTypes?: Array<PackedSessionType>;
  addOnConfiguration?: AddOnConfiguration;
}

export interface PriceListItem {
  id: string;
  priceListId: string;
  sessionType: SessionType;
  targetTiers?: Array<number>;
  rule: PriceListItemRule;
  productTaxRate: ProductTaxRate;
}

export interface SessionTypePricing {
  ticketPrice: Money;
  ticketPriceTaxBase: Money;
  surchargePrice: Money;
  surchargePriceTaxBase: Money;
  packFareBreakdown: Array<PackFareBreakdownItem> | null;
  priceList: PriceTypePricingPriceList;
  priceListItem: PriceListItem;
  children: Array<SessionTypePricing>;
  // The strikethrough customers see, as the API resolves it; null when it is not shown
  strikethroughDiscountPercentage: number | null;
  strikethroughPrice: Money | null;
  strikethroughPriceHintHidden: boolean | null;
}
