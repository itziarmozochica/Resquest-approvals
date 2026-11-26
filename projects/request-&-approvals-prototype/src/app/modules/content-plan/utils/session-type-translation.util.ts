import { PlanSessionType } from '../models/plan-session-types.model';
import { SessionTypeTranslation } from '../models/session-type-translation.model';
import { isSessionTypeFieldPopulated, isSessionTypeTranslationRowComplete } from './default-translation-field-catalog';
import { findPlanTranslationRowForLanguageScope, planTranslationLanguageKeysEqual } from './plan-translation-locale.util';
import { resolveOptionalTextFieldForSave } from './resolve-optional-translation-field-for-save.util';

export interface EditedSessionTypeFields {
  readonly details: string;
  readonly instructions: string;
  readonly label: string;
}

export interface EditedSessionTypeValidationRow extends EditedSessionTypeFields {
  readonly entityId: number;
}

export function isSessionTypeTranslationRowPopulated(
  translation: Pick<SessionTypeTranslation, 'details' | 'instructions' | 'label'> | undefined,
): boolean {
  if (translation === undefined) {
    return false;
  }
  return (
    isSessionTypeFieldPopulated('label', translation.label) ||
    isSessionTypeFieldPopulated('details', translation.details) ||
    isSessionTypeFieldPopulated('instructions', translation.instructions)
  );
}

export function isEditedSessionTypeEmpty(sessionType: EditedSessionTypeFields): boolean {
  return (
    !isSessionTypeFieldPopulated('label', sessionType.label) &&
    !isSessionTypeFieldPopulated('details', sessionType.details) &&
    !isSessionTypeFieldPopulated('instructions', sessionType.instructions)
  );
}

export function shouldDeleteEditedSessionType(original: EditedSessionTypeFields | undefined, current: EditedSessionTypeFields): boolean {
  if (original === undefined || isEditedSessionTypeEmpty(original)) {
    return false;
  }
  return isEditedSessionTypeEmpty(current);
}

export function buildSessionTypeHydrationBaselineFields(
  hydrated: EditedSessionTypeFields,
  translations: ReadonlyArray<SessionTypeTranslation>,
  languageCode: string | undefined,
  channelId: string | null,
): EditedSessionTypeFields {
  if (languageCode === undefined || languageCode === '') {
    return { details: '', instructions: '', label: '' };
  }
  const persisted = findSessionTypeTranslationForEditor(translations, languageCode, channelId);
  if (!isSessionTypeTranslationRowPopulated(persisted)) {
    return { details: '', instructions: '', label: '' };
  }
  return {
    details: hydrated.details,
    instructions: hydrated.instructions,
    label: hydrated.label,
  };
}

export function buildEditedSessionTypeHydrationBaseline<T extends EditedSessionTypeValidationRow>(
  editedSessionTypes: ReadonlyArray<T>,
  languageCode: string | undefined,
  channelId: string | null,
  sessionTypeTranslationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>,
): T[] {
  return editedSessionTypes.map((st: T) => ({
    ...st,
    ...buildSessionTypeHydrationBaselineFields(st, sessionTypeTranslationsByEntityId.get(st.entityId) ?? [], languageCode, channelId),
  }));
}

export function shouldDeleteEditedSessionTypeForScope(
  baseline: EditedSessionTypeFields | undefined,
  current: EditedSessionTypeFields,
  translations: ReadonlyArray<SessionTypeTranslation>,
  languageCode: string | undefined,
  channelId: string | null,
): boolean {
  if (!shouldDeleteEditedSessionType(baseline, current)) {
    return false;
  }
  if (languageCode === undefined || languageCode === '') {
    return false;
  }
  const persisted = findSessionTypeTranslationForEditor(translations, languageCode, channelId);
  return isSessionTypeTranslationRowPopulated(persisted);
}

export function hasEditedSessionTypeChangedFromBaseline(
  baseline: EditedSessionTypeFields | undefined,
  current: EditedSessionTypeFields,
): boolean {
  if (baseline === undefined) {
    return !isEditedSessionTypeEmpty(current);
  }
  return current.label !== baseline.label || current.details !== baseline.details || current.instructions !== baseline.instructions;
}

export function shouldSaveEditedSessionType(baseline: EditedSessionTypeFields | undefined, current: EditedSessionTypeFields): boolean {
  return isSessionTypeFieldPopulated('label', current.label) && hasEditedSessionTypeChangedFromBaseline(baseline, current);
}

export function areAllEditedSessionTypesValidForSave(
  editedSessionTypes: ReadonlyArray<EditedSessionTypeValidationRow>,
  hydrationBaseline: ReadonlyArray<EditedSessionTypeValidationRow>,
  targetLanguageCode: string | undefined,
  channelId: string | null,
  sessionTypeTranslationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>,
): boolean {
  return editedSessionTypes.every((st: EditedSessionTypeValidationRow) => {
    if (isSessionTypeFieldPopulated('label', st.label)) {
      return true;
    }
    const hasOptionalContent =
      isSessionTypeFieldPopulated('details', st.details) || isSessionTypeFieldPopulated('instructions', st.instructions);
    if (hasOptionalContent) {
      return false;
    }

    const baseline = hydrationBaseline.find((item: EditedSessionTypeValidationRow) => item.entityId === st.entityId);
    if (shouldDeleteEditedSessionType(baseline, st)) {
      return true;
    }

    const existing = sessionTypeTranslationsByEntityId.get(st.entityId) ?? [];
    const hadTranslation =
      !!targetLanguageCode &&
      existing.some(
        (item: SessionTypeTranslation) =>
          item.channelId === channelId && planTranslationLanguageKeysEqual(item.language, targetLanguageCode),
      );
    return !hadTranslation;
  });
}

export function findSessionTypeTranslationForEditor(
  translations: ReadonlyArray<SessionTypeTranslation>,
  languageCode: string,
  channelId?: string | null,
): SessionTypeTranslation | undefined {
  const scoped =
    channelId === undefined
      ? translations
      : translations.filter((translation: SessionTypeTranslation) => translation.channelId === channelId);
  const exact = scoped.find((translation: SessionTypeTranslation) => translation.language === languageCode);

  if (exact !== undefined && isSessionTypeTranslationRowPopulated(exact)) {
    return exact;
  }

  const populatedSibling = scoped.find(
    (translation: SessionTypeTranslation) =>
      translation.language !== languageCode &&
      planTranslationLanguageKeysEqual(translation.language, languageCode) &&
      isSessionTypeTranslationRowPopulated(translation),
  );
  if (populatedSibling !== undefined) {
    return populatedSibling;
  }

  if (exact !== undefined) {
    return exact;
  }

  return findPlanTranslationRowForLanguageScope(translations, languageCode, channelId);
}

export function findSessionTypeDeleteWireLanguageCodes(
  translations: ReadonlyArray<SessionTypeTranslation>,
  languageCode: string,
  channelId: string | null,
): string[] {
  const editorTranslation = findSessionTypeTranslationForEditor(translations, languageCode, channelId);
  if (editorTranslation !== undefined && isSessionTypeTranslationRowPopulated(editorTranslation)) {
    return [editorTranslation.language];
  }
  return [];
}

export function resolveSessionTypeOptionalFieldForSave(
  field: 'details' | 'instructions',
  current: string,
  persisted: string | undefined | null,
): string {
  const resolved = resolveOptionalTextFieldForSave(current, persisted, value => isSessionTypeFieldPopulated(field, value));
  return resolved ?? '';
}

export function hasAllSessionTypeTranslationsComplete(
  languageCode: string,
  channelId: string | null | undefined,
  planSessionTypes: readonly PlanSessionType[],
  sessionTypeTranslationsByEntityId: ReadonlyMap<number, readonly SessionTypeTranslation[]>,
): boolean {
  if (planSessionTypes.length === 0) {
    return true;
  }
  return planSessionTypes.every((sessionType: PlanSessionType) => {
    const translations = sessionTypeTranslationsByEntityId.get(sessionType.id) ?? [];
    const translation = findSessionTypeTranslationForEditor(translations, languageCode, channelId);
    return isSessionTypeTranslationRowComplete(translation, {
      originalDetails: sessionType.details ?? '',
      originalInstructions: sessionType.instructions ?? '',
    });
  });
}
