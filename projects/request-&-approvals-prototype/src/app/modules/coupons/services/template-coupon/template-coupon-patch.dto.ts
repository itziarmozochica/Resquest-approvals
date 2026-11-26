import { TemplateCouponKind } from '../../models/template-coupon/template-coupon.model';
import { TemplateCouponAdvancedSelectionFilterDTO } from './template-coupon-advanced-selection-filter.dto';
import { TemplateCouponSelectionFilters } from './template-coupon-selection-filters.dto';

export interface TemplateCouponPatchDTO {
  advanced_selection_filters?: Array<TemplateCouponAdvancedSelectionFilterDTO>;
  applies_to_surcharge: boolean;
  available_redeems: number | null;
  available_purchases: number | null;
  buy_m_pay_n: Array<number> | null;
  currency_identifier?: string | null;
  description: string;
  discount_quantity: number;
  expiration_date: string | null;
  is_active: boolean;
  kind: TemplateCouponKind;
  max_number_tickets_per_order: number | null;
  min_number_tickets_per_order: number | null;
  max_uses_per_user: number | null;
  number_of_tickets_purchasable: number | null;
  selection_filters?: TemplateCouponSelectionFilters;
  start_date: string | null;
  title: string;
}
