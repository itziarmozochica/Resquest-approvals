export const DEFAULT_CURRENCY_LOCALE = 'en-US';

export function formatCurrencyAmount(amount: number, currency: string, locale: string): string {
  for (const candidateLocale of [locale, DEFAULT_CURRENCY_LOCALE]) {
    for (const currencyDisplay of ['narrowSymbol', 'symbol'] as const) {
      try {
        return new Intl.NumberFormat(candidateLocale, { currency, currencyDisplay, style: 'currency' }).format(amount);
      } catch {
        continue;
      }
    }
  }

  return `${amount} ${currency}`;
}
