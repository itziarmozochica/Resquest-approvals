import { PlanSessionType } from '../models/plan-session-types.model';
import { PlanTranslation } from '../models/plan-translation.model';
import { SessionTypeTranslation } from '../models/session-type-translation.model';
import { computeDefaultTranslationFieldCounts } from './default-translation-field-count.util';
import { planTranslationLanguageKey, planTranslationLanguageKeysEqual } from './plan-translation-locale.util';

export interface PlanTranslationCompletionInput {
  readonly baseLocale: string;
  readonly configuredLocales: readonly string[];
  readonly manageableChannelIds: ReadonlySet<string>;
  readonly originalLabelFormat: string;
  readonly originalShortDescription: string;
  readonly planSessionTypes: readonly PlanSessionType[];
  readonly sessionTypeTranslationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>;
  readonly translations: readonly PlanTranslation[];
}

export type PlanTranslationLanguageStatus = 'complete' | 'missing' | 'unknown';

export function computePlanTranslationLanguageStatuses(
  input: PlanTranslationCompletionInput,
): ReadonlyMap<string, PlanTranslationLanguageStatus> {
  const baseCode = planTranslationLanguageKey(input.baseLocale);
  const scopes = buildManageableScopes(input);
  const statuses = new Map<string, PlanTranslationLanguageStatus>();
  for (const languageCode of collectNonDefaultLanguageCodes(input, baseCode)) {
    statuses.set(languageCode, computeLanguageStatus(input, languageCode, scopes));
  }
  return statuses;
}

export function isPlanTranslationComplete(input: PlanTranslationCompletionInput): boolean {
  const statuses = computePlanTranslationLanguageStatuses(input);
  if (statuses.size === 0) {
    return false;
  }

  let anyLanguageComplete = false;
  for (const status of statuses.values()) {
    if (status === 'missing') {
      return false;
    }
    if (status === 'complete') {
      anyLanguageComplete = true;
    }
  }
  return anyLanguageComplete;
}

function computeLanguageStatus(
  input: PlanTranslationCompletionInput,
  languageCode: string,
  scopes: readonly (string | null)[],
): PlanTranslationLanguageStatus {
  let hasAnyCountedField = false;
  for (const channelId of scopes) {
    if (!scopeHasTranslation(input, channelId, languageCode)) {
      continue;
    }
    const counts = computeDefaultTranslationFieldCounts({
      channelId,
      language: languageCode,
      originalLabelFormat: input.originalLabelFormat,
      originalShortDescription: input.originalShortDescription,
      planSessionTypes: input.planSessionTypes,
      planTranslations: input.translations,
      sessionTypeTranslationsByEntityId: input.sessionTypeTranslationsByEntityId,
    });
    if (counts.totalFieldCount <= 0) {
      continue;
    }
    hasAnyCountedField = true;
    if (!counts.isScopeTranslationComplete) {
      return 'missing';
    }
  }
  return hasAnyCountedField ? 'complete' : 'unknown';
}

function scopeHasTranslation(input: PlanTranslationCompletionInput, channelId: string | null, languageCode: string): boolean {
  const hasPlanRow = input.translations.some(
    (translation: PlanTranslation) =>
      translation.channelId === channelId && planTranslationLanguageKeysEqual(translation.language, languageCode),
  );
  if (hasPlanRow) {
    return true;
  }
  for (const list of input.sessionTypeTranslationsByEntityId.values()) {
    if (
      list.some(
        (item: SessionTypeTranslation) => item.channelId === channelId && planTranslationLanguageKeysEqual(item.language, languageCode),
      )
    ) {
      return true;
    }
  }
  return false;
}

function isChannelInScope(input: PlanTranslationCompletionInput, channelId: string | null): boolean {
  if (channelId === null) {
    return true;
  }
  return input.manageableChannelIds.has(channelId);
}

function buildManageableScopes(input: PlanTranslationCompletionInput): (string | null)[] {
  const scopes: (string | null)[] = [null];
  const activeChannelIds = new Set<string>();
  for (const translation of input.translations) {
    if (translation.channelId !== null && isChannelInScope(input, translation.channelId)) {
      activeChannelIds.add(translation.channelId);
    }
  }
  scopes.push(...activeChannelIds);
  return scopes;
}

function collectNonDefaultLanguageCodes(input: PlanTranslationCompletionInput, baseCode: string): string[] {
  const codes = new Set<string>();
  const add = (value: string | null | undefined): void => {
    if (!value) {
      return;
    }
    const code = planTranslationLanguageKey(value);
    if (code !== '' && code !== baseCode) {
      codes.add(code);
    }
  };

  input.configuredLocales.forEach(add);
  input.translations.forEach((translation: PlanTranslation) => {
    if (isChannelInScope(input, translation.channelId)) {
      add(translation.language);
    }
  });
  for (const list of input.sessionTypeTranslationsByEntityId.values()) {
    list.forEach((item: SessionTypeTranslation) => {
      if (isChannelInScope(input, item.channelId)) {
        add(item.language);
      }
    });
  }
  return Array.from(codes);
}
