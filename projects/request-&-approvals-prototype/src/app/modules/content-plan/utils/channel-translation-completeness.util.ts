import { AvailableLanguage } from '@fz-original/app/shared/translations/models/available-language.model';

import { PlanSessionType } from '../models/plan-session-types.model';
import { PlanTranslation } from '../models/plan-translation.model';
import { SessionTypeTranslation } from '../models/session-type-translation.model';
import { isPlanFieldPopulated } from './default-translation-field-catalog';
import {
  computeDefaultTranslationFieldCounts,
  DescriptionComponentCounts,
  isPlanTranslationNameDescriptionPopulated,
} from './default-translation-field-count.util';
import { planTranslationLanguageKeysEqual } from './plan-translation-locale.util';
import { hasAllSessionTypeTranslationsComplete } from './session-type-translation.util';

/** Resolves the per-component description counts for a given (channel, language) scope, or null when unknown. */
export type DescriptionComponentCountsResolver = (channelId: string | null, language: string) => DescriptionComponentCounts | null;

const COMPONENT_SCOPE_NULL_CHANNEL = '__null_channel__';

/** Stable key for a per-component description counts map, used by both producers and the resolver. */
export function descriptionComponentScopeKey(channelId: string | null, language: string): string {
  return `${channelId !== null && channelId !== '' ? channelId : COMPONENT_SCOPE_NULL_CHANNEL}::${language}`;
}

export function hasOverrideRow(
  translations: readonly PlanTranslation[],
  sessionTypeTranslationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>,
  channelId: string,
  language: string,
): boolean {
  if (translations.some((t: PlanTranslation) => t.channelId === channelId && planTranslationLanguageKeysEqual(t.language, language))) {
    return true;
  }
  for (const list of sessionTypeTranslationsByEntityId.values()) {
    if (
      list.some((item: SessionTypeTranslation) => item.channelId === channelId && planTranslationLanguageKeysEqual(item.language, language))
    ) {
      return true;
    }
  }
  return false;
}

export interface IsChannelTranslationCompleteInput {
  availableLanguages: readonly AvailableLanguage[];
  channelId: string | null;
  planSessionTypes: readonly PlanSessionType[];
  sessionTypeTranslationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>;
  translations: readonly PlanTranslation[];
  descriptionComponentCountsFor?: DescriptionComponentCountsResolver;
  /**
   * When set, the opaque `description` slot is replaced by the per-component
   * counts; if the resolver has none yet, the legacy check stands in.
   */
  hasComponentsDescription?: boolean;
  languageCode?: string;
  originalLabelFormat?: string;
  originalShortDescription?: string;
}

export function isChannelTranslationComplete(input: IsChannelTranslationCompleteInput): boolean {
  const {
    availableLanguages,
    hasComponentsDescription,
    languageCode,
    originalLabelFormat,
    originalShortDescription,
    planSessionTypes,
    sessionTypeTranslationsByEntityId,
    translations,
  } = input;

  const channelId: string | null = input.channelId === '' ? null : input.channelId;

  const channelTranslations = translations.filter((t: PlanTranslation) => t.channelId === channelId);

  const descriptionComponentCountsFor = (language: string): DescriptionComponentCounts | null =>
    hasComponentsDescription === true ? (input.descriptionComponentCountsFor?.(channelId, language) ?? null) : null;

  const isPlanRowMandatoryComplete = (row: PlanTranslation | undefined, language: string): boolean => {
    if (hasComponentsDescription === true && descriptionComponentCountsFor(language) !== null) {
      return isPlanFieldPopulated('name', row?.name);
    }
    return isPlanTranslationNameDescriptionPopulated(row);
  };

  const areDescriptionComponentsComplete = (language: string): boolean => {
    const counts = descriptionComponentCountsFor(language);
    if (counts === null) {
      return true;
    }
    return counts.total === 0 || counts.translated >= counts.total;
  };

  const isPlanRowComplete = (row: PlanTranslation | undefined, language: string): boolean =>
    isPlanRowMandatoryComplete(row, language) && areDescriptionComponentsComplete(language);

  if (languageCode !== undefined && languageCode !== '') {
    const defaultLanguageCode = availableLanguages.find((l: AvailableLanguage) => l.isDefault)?.code;
    if (channelId === null && defaultLanguageCode !== undefined && planTranslationLanguageKeysEqual(languageCode, defaultLanguageCode)) {
      return true;
    }
    const row = channelTranslations.find((t: PlanTranslation) => planTranslationLanguageKeysEqual(t.language, languageCode));
    if (!isPlanRowMandatoryComplete(row, languageCode)) {
      return false;
    }
    const counts = computeDefaultTranslationFieldCounts({
      channelId,
      descriptionComponentCounts: descriptionComponentCountsFor(languageCode),
      hasComponentsDescription,
      language: languageCode,
      originalLabelFormat: originalLabelFormat ?? '',
      originalShortDescription: originalShortDescription ?? '',
      planSessionTypes,
      planTranslations: translations,
      sessionTypeTranslationsByEntityId,
    });
    return counts.totalFieldCount > 0 && counts.isScopeTranslationComplete;
  }

  if (channelTranslations.length === 0) {
    return false;
  }

  const defaultLanguageCodeForNullChannel =
    channelId === null ? availableLanguages.find((l: AvailableLanguage) => l.isDefault)?.code : undefined;

  if (channelId === null && defaultLanguageCodeForNullChannel !== undefined) {
    const configuredNonDefaultLanguages: readonly AvailableLanguage[] = availableLanguages.filter(
      (language: AvailableLanguage) => !language.isDefault,
    );
    const allConfiguredNonDefaultHaveCompletePlanRow: boolean = configuredNonDefaultLanguages.every((language: AvailableLanguage) => {
      const translation: PlanTranslation | undefined = channelTranslations.find((item: PlanTranslation) =>
        planTranslationLanguageKeysEqual(item.language, language.code),
      );
      return isPlanRowComplete(translation, language.code);
    });
    if (!allConfiguredNonDefaultHaveCompletePlanRow) {
      return false;
    }
  }

  const defaultLanguageCode = defaultLanguageCodeForNullChannel;
  const nonDefaultTranslations =
    defaultLanguageCode !== undefined
      ? channelTranslations.filter((t: PlanTranslation) => !planTranslationLanguageKeysEqual(t.language, defaultLanguageCode))
      : channelTranslations;

  const allPlanTranslationsComplete = nonDefaultTranslations.every((translation: PlanTranslation) =>
    isPlanRowComplete(translation, translation.language),
  );
  if (!allPlanTranslationsComplete) {
    return false;
  }

  return nonDefaultTranslations
    .map((t: PlanTranslation) => t.language)
    .every((code: string) => hasAllSessionTypeTranslationsComplete(code, channelId, planSessionTypes, sessionTypeTranslationsByEntityId));
}
