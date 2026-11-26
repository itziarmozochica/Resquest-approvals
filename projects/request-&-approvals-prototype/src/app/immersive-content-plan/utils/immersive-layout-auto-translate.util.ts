import { HttpErrorResponse } from '@angular/common/http';

import type { ImmersiveLayoutDocument } from '../models/immersive-layout-document.model';
import type {
  AutoTranslateChunkResult,
  AutoTranslateMode,
  AutoTranslateOutcome,
  AutoTranslatePlan,
  AutoTranslateResult,
  TranslateTextsRequest,
  TranslateTextsResponse,
} from '../models/immersive-layout-translation.model';
import { translationOf } from './immersive-layout-field.util';
import { isValidLocaleKey, normalizeLocaleKey } from './immersive-layout-locale.util';
import { patchTranslation } from './immersive-layout-working.util';

export const autoTranslateTargetLimit = 10;
export const autoTranslateTextLimit = 5000;

function textOf(layout: ImmersiveLayoutDocument, token: string, locale: string): string {
  return translationOf(layout.translations, token, locale) ?? '';
}

// Unlike `isTokenTranslated`, a key holding `''` counts as missing: there is no text to keep.
export function autoTranslateTargets(
  layout: ImmersiveLayoutDocument,
  token: string,
  baseLocale: string,
  mode: AutoTranslateMode,
): string[] {
  const targets = layout.available_languages.filter(
    locale =>
      locale !== baseLocale && isValidLocaleKey(normalizeLocaleKey(locale)) && (mode === 'all' || textOf(layout, token, locale) === ''),
  );
  return [...new Set(targets)];
}

export function autoTranslateFilledTargets(layout: ImmersiveLayoutDocument, token: string, baseLocale: string): string[] {
  return autoTranslateTargets(layout, token, baseLocale, 'all').filter(locale => textOf(layout, token, locale) !== '');
}

export function autoTranslateSource(layout: ImmersiveLayoutDocument, token: string, baseLocale: string): string | null {
  const text = translationOf(layout.translations, token, baseLocale);
  if (text === null || text.trim() === '' || text.length > autoTranslateTextLimit) {
    return null;
  }
  return text;
}

export function buildTranslateRequests(source: string, baseLocale: string, targets: string[], token: string): TranslateTextsRequest[] {
  return [...targets.keys()]
    .filter(index => index % autoTranslateTargetLimit === 0)
    .map(start => ({
      sourceLocale: baseLocale,
      targetLocales: targets.slice(start, start + autoTranslateTargetLimit),
      texts: { [token]: source },
    }));
}

export function autoTranslatePlan(
  layout: ImmersiveLayoutDocument,
  token: string,
  baseLocale: string,
  mode: AutoTranslateMode,
): AutoTranslatePlan | null {
  const source = autoTranslateSource(layout, token, baseLocale);
  const targets = autoTranslateTargets(layout, token, baseLocale, mode);
  if (source === null || targets.length === 0) {
    return null;
  }
  const sentTexts = Object.fromEntries(targets.map(locale => [locale, textOf(layout, token, locale)]));
  return { sentTexts, source, targets };
}

// Hint only: a field that was never saved has no base text to have drifted from.
export function baseTextChanged(
  working: ImmersiveLayoutDocument,
  committed: ImmersiveLayoutDocument | null,
  token: string,
  baseLocale: string,
): boolean {
  const committedText = committed === null ? '' : textOf(committed, token, baseLocale);
  return committedText !== '' && committedText !== textOf(working, token, baseLocale);
}

// `responses[index]` answers `requests[index]`; `null` is a request that got no usable body.
export function mergeTranslateOutcomes(
  requests: TranslateTextsRequest[],
  responses: (TranslateTextsResponse | null)[],
  token: string,
): AutoTranslateOutcome {
  const outcomes = requests.flatMap((request, index) => {
    const response = responses[index];
    const reported = new Set((response?.failed ?? []).map(failure => failure?.locale));
    return request.targetLocales.map(locale => {
      const text = response?.translations?.[locale]?.[token];
      const isTranslated = !reported.has(locale) && typeof text === 'string' && text.trim() !== '';
      return { locale, text: isTranslated ? text : null };
    });
  });

  return {
    failedLocales: outcomes.filter(({ text }) => text === null).map(({ locale }) => locale),
    translations: Object.fromEntries(outcomes.flatMap(({ locale, text }) => (text === null ? [] : [[locale, text]]))),
  };
}

export function applyAutoTranslations<T extends ImmersiveLayoutDocument>(
  layout: T,
  token: string,
  translations: Record<string, string>,
  sentTexts: Record<string, string>,
): T {
  return Object.entries(translations).reduce(
    (current, [locale, text]) =>
      textOf(current, token, locale) === sentTexts[locale] ? patchTranslation(current, locale, token, text) : current,
    layout,
  );
}

function isHandledByAuthInterceptor(result: AutoTranslateChunkResult | null): boolean {
  return result instanceof HttpErrorResponse && (result.status === 401 || result.status === 403);
}

// `null` when the base text is no longer the one that was sent, so the answer describes text that is gone.
export function resolveAutoTranslateResult<T extends ImmersiveLayoutDocument>(
  current: T,
  token: string,
  baseLocale: string,
  plan: AutoTranslatePlan,
  requests: TranslateTextsRequest[],
  results: (AutoTranslateChunkResult | null)[],
): AutoTranslateResult<T> | null {
  if (autoTranslateSource(current, token, baseLocale) !== plan.source) {
    return null;
  }
  const responses = results.map(result => (result instanceof HttpErrorResponse ? null : result));
  const { failedLocales, translations } = mergeTranslateOutcomes(requests, responses, token);
  const targetCount = requests.reduce((count, request) => count + request.targetLocales.length, 0);
  const working = applyAutoTranslations(current, token, translations, plan.sentTexts);
  if (failedLocales.length === 0 || results.some(isHandledByAuthInterceptor)) {
    return { action: null, working };
  }
  return { action: { failedLocales, kind: failedLocales.length >= targetCount ? 'failed' : 'partial' }, working };
}
