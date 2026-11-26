import { formatCurrency, getCurrencySymbol } from '@angular/common';

import { StripeKeys } from '../../../environments/environment.model';

export class Money {
  constructor(
    public amount: number,
    public currency: keyof StripeKeys | string,
  ) {}

  static fromData(data: IMoney | null | undefined): Money | null {
    return data != null ? new Money(data.amount, data.currency) : null;
  }

  /**
   * When `digitsInfo` is omitted, `formatCurrency` uses the default fraction digits for the currency (same idea as `currency` pipe with `null`).
   */
  toString(locale: string = 'en-US', digitsInfo?: string): string {
    return formatCurrency(this.amount, locale, getCurrencySymbol(this.currency, 'narrow', locale), this.currency, digitsInfo);
  }
}

export type IMoney = Pick<Money, 'amount' | 'currency'>;
