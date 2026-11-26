import { Pipe, PipeTransform } from '@angular/core';

import { formatCurrencyAmount } from '../../utils/currency-locale.util';

@Pipe({
  name: 'kioskCurrency',
})
export class KioskCurrencyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency: string | null | undefined, locale: string): string {
    if (amount === null || amount === undefined || !currency) {
      return '';
    }

    return formatCurrencyAmount(amount, currency, locale);
  }
}
