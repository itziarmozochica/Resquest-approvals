export interface RemoveReservationCouponData {
  coupon_code: string;
  plan_id: number;
  reservation_id: string;
  source: 'reservation_confirmation' | 'reservation_checkout_details' | 'reservation_details_unpaid';
  success: boolean;
}
