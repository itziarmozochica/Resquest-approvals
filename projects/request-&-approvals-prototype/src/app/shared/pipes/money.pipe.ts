import { formatCurrency, getCurrencySymbol } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import { IMoney } from '../models/money.model';

@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(money: IMoney | null | undefined, locale: string): string {
    if (money == null) {
      return '-';
    }
    return formatCurrency(money.amount, locale, getCurrencySymbol(money.currency, 'narrow', locale), money.currency);
  }
}
