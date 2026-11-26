import languageCodes from '@fz-original/app/shared/components/language-selector/language-codes';

export function planTranslationLanguageKey(localeOrLanguageCode: string): string {
  if (!localeOrLanguageCode) {
    return '';
  }
  const normalized = localeOrLanguageCode.replace(/_/g, '-').toLowerCase();
  const segments = normalized.split('-').filter(Boolean);
  if (segments.length === 0) {
    return '';
  }
  const primary = segments[0];
  if (primary === 'zh' && segments.length > 1) {
    return `${segments[0]}-${segments[1]}`;
  }
  return primary;
}

export function planTranslationLanguageKeysEqual(a: string, b: string): boolean {
  return planTranslationLanguageKey(a) === planTranslationLanguageKey(b);
}

export function findPlanTranslationRowForLanguageScope<T extends PlanTranslationWireHintTranslationRow>(
  translations: ReadonlyArray<T>,
  languageCode: string,
  channelId?: string | null,
): T | undefined {
  const candidates = channelId === undefined ? translations : translations.filter((translation: T) => translation.channelId === channelId);

  const exactMatch = candidates.find((translation: T) => translation.language === languageCode);
  if (exactMatch) {
    return exactMatch;
  }

  return candidates.find((translation: T) => planTranslationLanguageKeysEqual(translation.language, languageCode));
}

export function findPlanTranslationRowIndexForLanguageScope<T extends PlanTranslationWireHintTranslationRow>(
  translations: ReadonlyArray<T>,
  languageCode: string,
  channelId: string | null,
): number {
  const exactIndex = translations.findIndex(
    (translation: T) => translation.language === languageCode && translation.channelId === channelId,
  );
  if (exactIndex >= 0) {
    return exactIndex;
  }

  return translations.findIndex(
    (translation: T) => planTranslationLanguageKeysEqual(translation.language, languageCode) && translation.channelId === channelId,
  );
}

export interface PlanTranslationWireHintTranslationRow {
  readonly channelId: string | null;
  readonly language: string;
}

export interface PlanTranslationWireHintSource {
  readonly planTranslations: ReadonlyArray<PlanTranslationWireHintTranslationRow>;
  readonly sessionTypeTranslationsByEntityId?: ReadonlyMap<number, ReadonlyArray<PlanTranslationWireHintTranslationRow>>;
  readonly planTranslationLocales?: readonly string[];
}

export function planTranslationWireHintsForCanonical(canonicalKey: string, source: PlanTranslationWireHintSource): readonly string[] {
  if (!canonicalKey) {
    return [];
  }
  const fromPlan = source.planTranslations
    .filter(
      (translation: PlanTranslationWireHintTranslationRow) =>
        translation.channelId === null && planTranslationLanguageKeysEqual(translation.language, canonicalKey),
    )
    .map((translation: PlanTranslationWireHintTranslationRow) => translation.language);
  const sessionTypeGroups = source.sessionTypeTranslationsByEntityId ? Array.from(source.sessionTypeTranslationsByEntityId.values()) : [];
  const fromSessionTypes = sessionTypeGroups.flatMap((translations: ReadonlyArray<PlanTranslationWireHintTranslationRow>) =>
    translations
      .filter(
        (item: PlanTranslationWireHintTranslationRow) =>
          item.channelId === null && planTranslationLanguageKeysEqual(item.language, canonicalKey),
      )
      .map((item: PlanTranslationWireHintTranslationRow) => item.language),
  );
  const fromLocales = (source.planTranslationLocales ?? []).filter((locale: string) =>
    planTranslationLanguageKeysEqual(locale, canonicalKey),
  );
  return Array.from(new Set<string>([...fromPlan, ...fromSessionTypes, ...fromLocales].filter((value: string) => value !== '')));
}

export function planTranslationWireLanguageCodeForTracking(
  canonicalKey: string,
  catalogEntries: ReadonlyArray<{ code: string }>,
  source: PlanTranslationWireHintSource,
): string {
  return planTranslationWireLanguageCode(canonicalKey, catalogEntries, planTranslationWireHintsForCanonical(canonicalKey, source));
}

export function planTranslationWireLanguageCode(
  canonicalKey: string,
  catalogEntries: ReadonlyArray<{ code: string }>,
  planWireHints?: readonly string[],
): string {
  if (!canonicalKey) {
    return canonicalKey;
  }
  const matches: { code: string }[] = catalogEntries
    .filter((entry: { code: string }) => !!entry.code && planTranslationLanguageKeysEqual(entry.code, canonicalKey))
    .filter(
      (entry: { code: string }, index: number, all: ReadonlyArray<{ code: string }>) =>
        all.findIndex((e: { code: string }) => e.code === entry.code) === index,
    )
    .map((entry: { code: string }) => ({ code: entry.code }));
  if (matches.length === 0) {
    return canonicalKey;
  }
  if (matches.length === 1) {
    return matches[0].code;
  }
  const hints = planWireHints ?? [];
  for (const hint of hints) {
    if (!planTranslationLanguageKeysEqual(hint, canonicalKey)) {
      continue;
    }
    const exact = matches.find((m: { code: string }) => m.code === hint);
    if (exact) {
      return exact.code;
    }
    const relaxed = matches.find((m: { code: string }) => planTranslationLanguageKeysEqual(m.code, hint));
    if (relaxed) {
      return relaxed.code;
    }
  }
  return matches[0].code;
}

export function planTranslationCatalogDisplayName(
  canonicalCode: string,
  catalog: ReadonlyArray<{ code: string; name: string }>,
  planWireHints?: readonly string[],
): string {
  if (!canonicalCode) {
    return '';
  }
  if (catalog.length === 0) {
    return planTranslationTabLanguageLabel(canonicalCode);
  }
  const wireCode = planTranslationWireLanguageCode(canonicalCode, catalog, planWireHints);
  const wireMatch = catalog.find((entry: { code: string; name: string }) => entry.code === wireCode && (entry.name ?? '').trim() !== '');
  if (wireMatch) {
    return wireMatch.name.trim();
  }
  const namedCanonical = catalog.find(
    (entry: { code: string; name: string }) =>
      (entry.name ?? '').trim() !== '' && planTranslationLanguageKeysEqual(entry.code, canonicalCode),
  );
  if (namedCanonical) {
    return namedCanonical.name.trim();
  }
  return planTranslationTabLanguageLabel(canonicalCode);
}

export function planTranslationDisplayNameFromAvailableLanguage(language: { code: string; name?: string | null }): string {
  const trimmed = (language.name ?? '').trim();
  return trimmed !== '' ? trimmed : planTranslationTabLanguageLabel(language.code);
}

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

export function planTranslationTabLanguageLabel(code: string): string {
  const normalizedKey = normalizeCatalogLocaleKey(code);
  if (normalizedKey === 'zh-CN') {
    return 'Chinese (Simplified)';
  }
  if (normalizedKey === 'zh-TW') {
    return 'Chinese (Traditional)';
  }
  return languageCodes[normalizedKey] ?? languageCodes[code] ?? code;
}
