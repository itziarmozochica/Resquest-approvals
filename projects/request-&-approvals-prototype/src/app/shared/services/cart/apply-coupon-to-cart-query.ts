export interface ApplyCouponToCartBodyParam {
  cartId: string;
  couponCode?: string | null;
  partnerId: number;
  userId: number;
}
