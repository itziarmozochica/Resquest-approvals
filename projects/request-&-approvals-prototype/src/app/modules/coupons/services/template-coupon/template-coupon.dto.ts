import { TemplateCouponKind, TemplateCouponStatus } from '../../models/template-coupon/template-coupon.model';

export interface TemplateCouponDTO {
  template_coupon_id: number;
  title: string;
  kind: TemplateCouponKind;
  code: string;
  discount_quantity: number;
  currency_identifier: string;
  current_usages: number;
  total_available_usages: number | null;
  current_consumptions: number;
  total_available_consumptions: number | null;
  status: TemplateCouponStatus;
  start_date: string | null;
  expiration_date: string;
  is_active: boolean;
}
