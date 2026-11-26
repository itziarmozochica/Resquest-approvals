import {
  AI_TRANSLATION_FIELD_KEYS,
  AiSessionTypeFieldKey,
  aiSessionTypeFieldKeys,
  AiSessionTypeFields,
  AiSessionTypeTarget,
  AiSessionTypeTargetKey,
  AiSessionTypeTranslatedValue,
  AiSessionTypeTranslation,
  AiTranslatedContent,
  AiTranslatedSessionType,
  AiTranslationFieldKey,
  AiTranslationFields,
  AiTranslationTargetKey,
  AiTranslationTrackedFieldType,
} from '../models/ai-translation.model';
import { isHtmlMeaningful, isSessionTypeFieldPopulated, isTranslationTextPopulated } from './default-translation-field-catalog';

const sessionTypeTargetKeyPrefix = 'sessionType:';

const trackedSessionTypeFieldTypes: Readonly<Record<AiSessionTypeFieldKey, AiTranslationTrackedFieldType>> = {
  details: 'sessionTypeDetails',
  instructions: 'sessionTypeInstructions',
  label: 'sessionTypeLabel',
};

const translatedContentKeys = ['name', 'description', 'short_description', 'label_format', 'mandatory_purchase_terms', 'session_types'];
const translatedContentKeySet = new Set<string>(translatedContentKeys);

export function aiSessionTypeTargetKey(sessionTypeId: number, field: AiSessionTypeFieldKey): AiSessionTypeTargetKey {
  return `${sessionTypeTargetKeyPrefix}${sessionTypeId}:${field}`;
}

export function aiSessionTypeTargetsByKey(
  sessionTypes: readonly { readonly entityId: number }[],
): ReadonlyMap<AiTranslationTargetKey, AiSessionTypeTarget> {
  const targets = new Map<AiTranslationTargetKey, AiSessionTypeTarget>();
  for (const sessionType of sessionTypes) {
    for (const field of aiSessionTypeFieldKeys) {
      targets.set(aiSessionTypeTargetKey(sessionType.entityId, field), {
        field,
        sessionTypeId: sessionType.entityId,
      });
    }
  }
  return targets;
}

export function aiSessionTypeTrackedFieldType(field: AiSessionTypeFieldKey): AiTranslationTrackedFieldType {
  return trackedSessionTypeFieldTypes[field];
}

export function isAiTranslationFieldKey(key: AiTranslationTargetKey): key is AiTranslationFieldKey {
  return AI_TRANSLATION_FIELD_KEYS.some((field: AiTranslationFieldKey) => field === key);
}

export function parseAiSessionTypeTranslations(
  translatedSessionTypes: unknown,
  requested: readonly AiSessionTypeTranslation[],
): readonly AiSessionTypeTranslation[] | null {
  if (translatedSessionTypes === undefined) {
    return [];
  }
  if (!Array.isArray(translatedSessionTypes) || !translatedSessionTypes.every(isAiTranslatedSessionType)) {
    return null;
  }
  return requested.flatMap((requestedSessionType: AiSessionTypeTranslation) => {
    const translated = translatedSessionTypes.find((item: AiTranslatedSessionType) => item.session_type_id === requestedSessionType.id);
    if (translated === undefined) {
      return [];
    }
    const fields: AiSessionTypeFields = {};
    for (const field of requestedAiSessionTypeFieldKeys(requestedSessionType.fields)) {
      const value = translated[field];
      if (typeof value === 'string' && value.length > 0) {
        fields[field] = value;
      }
    }
    return requestedAiSessionTypeFieldKeys(fields).length > 0 ? [{ fields, id: requestedSessionType.id }] : [];
  });
}

export function pickMeaningfulAiSessionTypes(sessionTypes: readonly AiSessionTypeTranslation[]): readonly AiSessionTypeTranslation[] {
  return sessionTypes.flatMap((sessionType: AiSessionTypeTranslation) => {
    const fields = pickMeaningfulAiSessionTypeFields(sessionType.fields);
    return requestedAiSessionTypeFieldKeys(fields).length > 0 ? [{ fields, id: sessionType.id }] : [];
  });
}

export function requestedAiTranslationTargetKeys(
  fields: AiTranslationFields,
  sessionTypes: readonly AiSessionTypeTranslation[],
): readonly AiTranslationTargetKey[] {
  return [
    ...requestedAiTranslationFieldKeys(fields),
    ...sessionTypes.flatMap((sessionType: AiSessionTypeTranslation) =>
      requestedAiSessionTypeFieldKeys(sessionType.fields).map((field: AiSessionTypeFieldKey) =>
        aiSessionTypeTargetKey(sessionType.id, field),
      ),
    ),
  ];
}

export function usableAiSessionTypeValues(sessionTypes: readonly AiSessionTypeTranslation[]): readonly AiSessionTypeTranslatedValue[] {
  return sessionTypes.flatMap((sessionType: AiSessionTypeTranslation) =>
    aiSessionTypeFieldKeys.flatMap((field: AiSessionTypeFieldKey) => {
      const value = sessionType.fields[field];
      if (typeof value !== 'string' || !isSessionTypeFieldPopulated(field, value)) {
        return [];
      }
      return [{ field, key: aiSessionTypeTargetKey(sessionType.id, field), sessionTypeId: sessionType.id, value }];
    }),
  );
}

export function isAiTranslationSourceMeaningful(field: AiTranslationFieldKey, value: string): boolean {
  if (field === 'description' || field === 'mandatoryPurchaseTerms') {
    return isHtmlMeaningful(value);
  }
  return isTranslationTextPopulated(value);
}

export function pickMeaningfulAiTranslationFields(fields: AiTranslationFields): AiTranslationFields {
  const next: AiTranslationFields = {};
  if (isAiTranslationSourceMeaningful('name', fields.name ?? '')) {
    next.name = fields.name;
  }
  if (isAiTranslationSourceMeaningful('description', fields.description ?? '')) {
    next.description = fields.description;
  }
  if (isAiTranslationSourceMeaningful('shortDescription', fields.shortDescription ?? '')) {
    next.shortDescription = fields.shortDescription;
  }
  if (isAiTranslationSourceMeaningful('labelFormat', fields.labelFormat ?? '')) {
    next.labelFormat = fields.labelFormat;
  }
  if (isAiTranslationSourceMeaningful('mandatoryPurchaseTerms', fields.mandatoryPurchaseTerms ?? '')) {
    next.mandatoryPurchaseTerms = fields.mandatoryPurchaseTerms;
  }
  return next;
}

export function requestedAiTranslationFieldKeys(fields: AiTranslationFields): readonly AiTranslationFieldKey[] {
  return AI_TRANSLATION_FIELD_KEYS.filter((key: AiTranslationFieldKey) => fields[key] !== undefined);
}

export function mapAiTranslationFields(
  translatedContent: AiTranslatedContent,
  requestedKeys: readonly AiTranslationFieldKey[],
): AiTranslationFields | null {
  const fields: AiTranslationFields = {};
  for (const key of requestedKeys) {
    const mapped = mapTranslatedContentValue(translatedContent, key);
    if (mapped === undefined) {
      return null;
    }
    if (typeof mapped === 'string' && mapped.length === 0) {
      continue;
    }
    fields[key] = mapped;
  }
  return fields;
}

export function parseTranslatedContent(translatedText: string): AiTranslatedContent | null {
  const parsed: unknown = parseJson(translatedText);
  return isAiTranslatedContent(parsed) ? parsed : null;
}

function isAiSessionTypeFieldKey(value: string): value is AiSessionTypeFieldKey {
  return aiSessionTypeFieldKeys.some((key: AiSessionTypeFieldKey) => key === value);
}

function isAiTranslatedSessionType(value: unknown): value is AiTranslatedSessionType {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || !('session_type_id' in value)) {
    return false;
  }
  const { session_type_id: sessionTypeId, ...fields } = value;
  if (typeof sessionTypeId !== 'number' || !Number.isInteger(sessionTypeId)) {
    return false;
  }
  return Object.entries(fields).every(
    ([key, fieldValue]: [string, unknown]) => isAiSessionTypeFieldKey(key) && (fieldValue === null || typeof fieldValue === 'string'),
  );
}

function pickMeaningfulAiSessionTypeFields(fields: AiSessionTypeFields): AiSessionTypeFields {
  const next: AiSessionTypeFields = {};
  for (const field of aiSessionTypeFieldKeys) {
    const value = fields[field];
    if (isSessionTypeFieldPopulated(field, value)) {
      next[field] = value;
    }
  }
  return next;
}

function requestedAiSessionTypeFieldKeys(fields: AiSessionTypeFields): readonly AiSessionTypeFieldKey[] {
  return aiSessionTypeFieldKeys.filter((key: AiSessionTypeFieldKey) => fields[key] !== undefined);
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function isAiTranslatedContent(value: unknown): value is AiTranslatedContent {
  if (!isRecord(value)) {
    return false;
  }
  return Object.keys(value).every((key: string) => translatedContentKeySet.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function mapTranslatedContentValue(translatedContent: AiTranslatedContent, key: AiTranslationFieldKey): string | null | undefined {
  switch (key) {
    case 'name':
      return asNullableString(translatedContent.name);
    case 'description':
      return asNullableString(translatedContent.description);
    case 'shortDescription':
      return asNullableString(translatedContent.short_description);
    case 'labelFormat':
      return asNullableString(translatedContent.label_format);
    case 'mandatoryPurchaseTerms':
      return asNullableString(translatedContent.mandatory_purchase_terms);
    default:
      return undefined;
  }
}

function parseJson(translatedText: string): unknown {
  try {
    return JSON.parse(translatedText);
  } catch {
    return null;
  }
}
