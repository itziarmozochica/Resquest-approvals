import { TemplateCouponTypeET } from '../../models/template-coupon/template-coupon-type.model';
import { TemplateCouponKindET } from '../../models/template-coupon/template-coupon.model';
import { TemplateCouponAdvancedSelectionFilterDTO } from './template-coupon-advanced-selection-filter.dto';
import { TemplateCouponSelectionFilters } from './template-coupon-selection-filters.dto';

export interface TemplateCouponCreateDTO {
  advanced_selection_filters: Array<TemplateCouponAdvancedSelectionFilterDTO>;
  applies_to_surcharge: boolean;
  available_redeems: number | null;
  available_purchases: number | null;
  buy_m_pay_n: Array<number> | null;
  code: string | null;
  code_prefix: string | null;
  count_to_create: number | null;
  currency_identifier: string | null;
  description: string | null;
  discount_quantity: number | null;
  expiration_date: string | null;
  kind: TemplateCouponKindET;
  max_number_tickets_per_order: number | null;
  min_number_tickets_per_order: number | null;
  max_uses_per_user: number | null;
  number_of_tickets_purchasable: number | null;
  selection_filters: TemplateCouponSelectionFilters;
  start_date: string | null;
  template_coupon_type: TemplateCouponTypeET;
  title: string | null;
}
