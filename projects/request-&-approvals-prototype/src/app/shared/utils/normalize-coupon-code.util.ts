/**
 * Returns a coupon code trimmed and in uppercase.
 * Coupon codes only contain uppercase letters and digits, so a code typed in lowercase or pasted with surrounding whitespace still applies.
 */
export function normalizeCouponCode(code: string | null): string {
  return (code ?? '').trim().toUpperCase();
}
