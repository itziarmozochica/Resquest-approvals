const currencySymbolsByCode: Readonly<Record<string, string>> = {
  INR: '₹',
};

export function replaceCurrencySymbolWithCode(content: string): string {
  return Object.entries(currencySymbolsByCode).reduce(
    (result: string, [code, symbol]: [string, string]) => result.replace(new RegExp(symbol, 'g'), `${code} `),
    content,
  );
}

export function truncateText(text: string, maxCharacters: number): string {
  if (text.length > maxCharacters) {
    return text.substring(0, maxCharacters) + '...';
  }
  return text;
}
