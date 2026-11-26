export interface ApplyCouponToCartBusinessBodyParam {
  cartId: string;
  couponCode?: string | null;
  partnerId: number;
  userId: number;
}
