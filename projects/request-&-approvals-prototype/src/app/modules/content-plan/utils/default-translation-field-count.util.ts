import { PlanSessionType } from '../models/plan-session-types.model';
import { PlanTranslation } from '../models/plan-translation.model';
import { SessionTypeTranslation } from '../models/session-type-translation.model';
import { countPlanTranslationSlots, countSessionTypeTranslationSlots } from './default-translation-field-catalog';
import { planTranslationLanguageKeysEqual } from './plan-translation-locale.util';

export const TERMS_AND_CONDITIONS_NULL_CHANNEL_KEY = 'null';

export interface TermsAndConditionsChangePayload {
  channelId: string | null;
  html: string;
  language: string;
}

export interface DescriptionComponentCounts {
  readonly total: number;
  readonly translated: number;
}

export interface DefaultTranslationFieldCountInput {
  language: string;
  originalLabelFormat: string;
  planSessionTypes: readonly PlanSessionType[];
  planTranslations: readonly PlanTranslation[];
  sessionTypeTranslationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>;
  channelId?: string | null;
  descriptionComponentCounts?: DescriptionComponentCounts | null;
  /**
   * With `descriptionComponentCounts` supplied, the opaque `description` slot is
   * replaced by those counts; without them the legacy single slot stands in.
   */
  hasComponentsDescription?: boolean;
  originalShortDescription?: string;
}

export function buildTermsAndConditionsKey(language: string, channelId: string | null | undefined): string {
  return `${language}:${channelId ?? TERMS_AND_CONDITIONS_NULL_CHANNEL_KEY}`;
}

export interface DefaultTranslationFieldCounts {
  isScopeTranslationComplete: boolean;
  totalFieldCount: number;
  translatedFieldCount: number;
}

export function computeDefaultTranslationFieldCounts(input: DefaultTranslationFieldCountInput): DefaultTranslationFieldCounts {
  const channelId = input.channelId === null || input.channelId === undefined || input.channelId === '' ? null : input.channelId;

  const planTranslation = input.planTranslations.find(
    (translation: PlanTranslation) =>
      translation.channelId === channelId && planTranslationLanguageKeysEqual(translation.language, input.language),
  );

  const useComponentDescription = input.hasComponentsDescription === true && input.descriptionComponentCounts != null;
  const originals = {
    excludeDescription: useComponentDescription,
    originalLabelFormat: input.originalLabelFormat,
    originalShortDescription: input.originalShortDescription ?? '',
  };
  const plan = countPlanTranslationSlots(planTranslation, originals);

  let sessionTypesTotal = 0;
  let sessionTypesTranslated = 0;
  for (const sessionType of input.planSessionTypes) {
    const translations = input.sessionTypeTranslationsByEntityId.get(sessionType.id) ?? [];
    const translation = translations.find(
      (item: SessionTypeTranslation) => item.channelId === channelId && planTranslationLanguageKeysEqual(item.language, input.language),
    );
    const st = countSessionTypeTranslationSlots(translation, {
      originalDetails: sessionType.details ?? '',
      originalInstructions: sessionType.instructions ?? '',
    });
    sessionTypesTotal += st.total;
    sessionTypesTranslated += st.translated;
  }

  const descriptionComponentTotal = useComponentDescription ? input.descriptionComponentCounts!.total : 0;
  const descriptionComponentTranslated = useComponentDescription ? input.descriptionComponentCounts!.translated : 0;
  const totalFieldCount = plan.total + sessionTypesTotal + descriptionComponentTotal;
  const translatedFieldCount = plan.translated + sessionTypesTranslated + descriptionComponentTranslated;

  return {
    isScopeTranslationComplete: totalFieldCount > 0 && translatedFieldCount >= totalFieldCount,
    totalFieldCount,
    translatedFieldCount,
  };
}

export { isPlanTranslationNameDescriptionPopulated } from './default-translation-field-catalog';
