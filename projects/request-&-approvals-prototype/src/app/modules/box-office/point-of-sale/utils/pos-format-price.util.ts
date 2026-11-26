import { formatCurrency, getCurrencySymbol } from '@angular/common';

import { type Money } from '@fz/ticketing';

export function formatPosPrice(money: Money, locale: string): string {
  return locale.length === 0
    ? ''
    : formatCurrency(Number(money.amount), locale, getCurrencySymbol(money.currency, 'narrow', locale), money.currency);
}
