import languageCodes from '@fz-original/app/shared/components/language-selector/language-codes';

function normalizeCatalogLocaleKey(locale: string): string {
  if (!locale) {
    return '';
  }
  const parts = locale.replace(/_/g, '-').split('-');
  if (parts.length === 1) {
    return parts[0].toLowerCase();
  }
  return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
}

export function immersiveLocaleDisplayName(locale: string): string {
  const normalizedKey = normalizeCatalogLocaleKey(locale);
  if (normalizedKey === 'zh-CN') {
    return 'Chinese (Simplified)';
  }
  if (normalizedKey === 'zh-TW') {
    return 'Chinese (Traditional)';
  }
  return languageCodes[normalizedKey] ?? languageCodes[locale] ?? locale;
}

export function formatImmersiveLocaleLabel(locale: string): string {
  const name = immersiveLocaleDisplayName(locale);
  return name === locale ? locale : `${name} (${locale})`;
}
