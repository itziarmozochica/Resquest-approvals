import { TemplateCouponTypeET } from '../../models/template-coupon/template-coupon-type.model';
import { TemplateCouponKindET } from '../../models/template-coupon/template-coupon.model';
import { TemplateCouponAdvancedSelectionFilterDTO } from './template-coupon-advanced-selection-filter.dto';
import { TemplateCouponSelectionFilters } from './template-coupon-selection-filters.dto';

export interface TemplateCouponDetailDTO {
  advanced_selection_filters: Array<TemplateCouponAdvancedSelectionFilterDTO>;
  applies_to_surcharge: boolean;
  available_purchases: number | null;
  available_usages: number | null;
  buy_m_pay_n: Array<number>;
  code: string | null;
  code_prefix: string | null;
  count_to_create: number;
  currency_identifier: string;
  current_consumptions: number;
  current_usages: number;
  description: string;
  discount_quantity: number;
  expiration_date: string;
  is_active: boolean;
  kind: TemplateCouponKindET;
  max_number_tickets_per_order: number | null;
  min_number_tickets_per_order: number | null;
  max_uses_per_user: number | null;
  number_of_tickets_purchasable: number | null;
  selection_filters: TemplateCouponSelectionFilters;
  start_date: string;
  status: string;
  template_coupon_type: TemplateCouponTypeET;
  title: string;
  total_available_consumptions: number | null;
  total_available_usages: number | null;
}
