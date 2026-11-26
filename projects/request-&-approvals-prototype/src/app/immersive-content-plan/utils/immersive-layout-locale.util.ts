import type { ImmersiveLayoutDocument, ImmersiveLayoutTranslations } from '../models/immersive-layout-document.model';

// The editor's one English fallback: the locale a base-locale resolution prefers, and the language
// a token label falls back to when neither the base locale nor the selected one has content.
export const PREFERRED_BASE_LOCALE = 'en_GB';

function languageOf(locale: string): string {
  return locale.split('_')[0];
}

function isFallbackLanguage(locale: string): boolean {
  return languageOf(locale) === languageOf(PREFERRED_BASE_LOCALE);
}

export function resolveBaseLocale(availableLanguages: string[], preferredLocale: string): string | null {
  if (availableLanguages.length === 0) {
    return null;
  }

  if (availableLanguages.includes(preferredLocale)) {
    return preferredLocale;
  }

  const preferredLanguage = languageOf(preferredLocale);
  const sameLanguageLocale = availableLanguages.find(locale => languageOf(locale) === preferredLanguage);
  if (sameLanguageLocale) {
    return sameLanguageLocale;
  }

  const englishLocale = availableLanguages.find(isFallbackLanguage);
  if (englishLocale) {
    return englishLocale;
  }

  return [...availableLanguages].sort()[0];
}

export function resolveTokenLabel(translations: ImmersiveLayoutTranslations, token: string, baseLocale: string | null): string | null {
  if (baseLocale) {
    const baseValue = translations[baseLocale]?.[token];
    if (baseValue) {
      return baseValue;
    }
  }

  const locales = Object.keys(translations);

  const englishLocale = locales.find(locale => isFallbackLanguage(locale) && translations[locale]?.[token]);
  if (englishLocale) {
    return translations[englishLocale][token];
  }

  const anyLocale = locales.find(locale => translations[locale]?.[token]);
  if (anyLocale) {
    return translations[anyLocale][token];
  }

  return null;
}

const LOCALE_KEY_PATTERN = /^[a-z]{2}_[A-Z]{2}$/;

export function normalizeLocaleKey(locale: string): string {
  const normalized = locale.replace('-', '_');
  const [language, region] = normalized.split('_');
  if (language === undefined || region === undefined) {
    return locale;
  }
  return `${language.toLowerCase()}_${region.toUpperCase()}`;
}

export function isValidLocaleKey(locale: string): boolean {
  return LOCALE_KEY_PATTERN.test(locale);
}

// Two distinct keys that normalise to the same one (`en-GB` and `en_GB`) would collapse into a
// single bucket and silently drop a locale from a full-replace payload. Returning the document
// untouched keeps the offending key visible, so `collectLocaleKeyErrors` reports it and the
// publish gate blocks instead.
function hasNormalizationCollision(keys: readonly string[]): boolean {
  const distinctKeys = new Set(keys);
  return new Set([...distinctKeys].map(normalizeLocaleKey)).size !== distinctKeys.size;
}

export function normalizeDocumentLocales<T extends ImmersiveLayoutDocument>(document: T): T {
  if (hasNormalizationCollision(document.available_languages) || hasNormalizationCollision(Object.keys(document.translations))) {
    return document;
  }

  const availableLanguages = document.available_languages.map(normalizeLocaleKey);
  const translations = Object.entries(document.translations).reduce<ImmersiveLayoutTranslations>((bucket, [locale, values]) => {
    bucket[normalizeLocaleKey(locale)] = values;
    return bucket;
  }, {});

  return {
    ...document,
    available_languages: [...new Set(availableLanguages)],
    ...(document.base_locale == null ? {} : { base_locale: normalizeLocaleKey(document.base_locale) }),
    translations,
  };
}

/**
 * Where the locale selection lands once a write has been persisted.
 *
 * Most writes ship the locale-normalised document, so the selection has to follow it or it points
 * at a bucket that no longer exists: every copy field reads empty, and the next keystroke mints the
 * old bucket again, collides on the following normalisation and blocks the save. A revert is the
 * exception — it ships the committed keys untouched — so the rule is the document, not the intent:
 * keep the selection when the persisted document still answers to it.
 */
export function selectedLocaleAfterWrite(selected: string | null, persisted: ImmersiveLayoutDocument): string | null {
  if (selected === null || selected in persisted.translations) {
    return selected;
  }
  return normalizeLocaleKey(selected);
}

export function hasLocaleCopy(document: Pick<ImmersiveLayoutDocument, 'translations'>, locale: string): boolean {
  return Object.values(document.translations[locale] ?? {}).some(value => value.trim() !== '');
}

/**
 * The locale list as an editor lists it: the base locale first, then the rest in document order.
 * A missing or unavailable base leaves the document order untouched.
 */
export function orderedLocales(availableLanguages: readonly string[], baseLocale: string | null): string[] {
  if (baseLocale === null || !availableLanguages.includes(baseLocale)) {
    return [...availableLanguages];
  }
  return [baseLocale, ...availableLanguages.filter(locale => locale !== baseLocale)];
}
