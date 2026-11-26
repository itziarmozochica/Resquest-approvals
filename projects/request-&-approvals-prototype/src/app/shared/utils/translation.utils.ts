import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export const hasTranslationKey = (translations: Record<string, unknown> | null | undefined, key: string): boolean => {
  if (!translations) {
    return false;
  }

  const value = key.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, translations);

  return typeof value === 'string' && value.length > 0;
};

export const resolveTranslationKey = (
  translations: Record<string, unknown> | null | undefined,
  primaryKey: string,
  fallbackKey: string,
): string => (hasTranslationKey(translations, primaryKey) ? primaryKey : fallbackKey);

export const resolveTranslationKeyFromService = (
  translate: TranslateService,
  primaryKey: string,
  fallbackKey: string,
): Observable<string> => {
  const currentLang = translate.currentLang;
  if (!currentLang) {
    return of(fallbackKey);
  }

  return translate.getTranslation(currentLang).pipe(map(translations => resolveTranslationKey(translations, primaryKey, fallbackKey)));
};

export const hasTranslationKeyFromService = (translate: TranslateService, key: string): Observable<boolean> => {
  const currentLang = translate.currentLang;
  if (!currentLang) {
    return of(false);
  }

  return translate.getTranslation(currentLang).pipe(map(translations => hasTranslationKey(translations, key)));
};
