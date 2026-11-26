import type { CouponCardEvent } from '@fz-original/app/shared/components/coupon-card/coupon-card-event';
import type { CouponCodeEvent } from '@fz-original/app/shared/components/coupon-code/coupon-code-event';
import type { BehaviorSubject, Subject } from 'rxjs';

export interface CouponCodeSelectorModalData {
  error: BehaviorSubject<Error | null>;
  scannedCode: BehaviorSubject<string | null>;
}

export type CouponCodeSelectorModalResult = CouponCardEvent | undefined;

export interface CouponCodeModalData {
  couponCode$: Subject<CouponCodeEvent>;
  error: BehaviorSubject<Error | null>;
  lazyCouponType: string | null;
  scannedCode: BehaviorSubject<string | null>;
  title: string;
  hasNavigation?: boolean;
  inputCode?: string;
  subtitleKey?: string;
}

export type CouponCodeModalResult = 'Back click' | 'Open scanner' | undefined;
