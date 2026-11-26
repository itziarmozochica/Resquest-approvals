import { defineEvent } from '@fz/fz-tracking/src/public-api';

export type PosCheckoutPromoCodesOpenManualScannerSource = 'additional' | 'custom' | 'lazy_coupon';

export interface PosCheckoutPromoCodesOpenManualScannerData {
  source: PosCheckoutPromoCodesOpenManualScannerSource;
}

export const posCheckoutPromoCodesOpenManualScanner = defineEvent<PosCheckoutPromoCodesOpenManualScannerData>(
  'pos.checkout.promoCodes.openManualScanner',
);
