export interface AiTranslationFields {
  description?: string | null;
  labelFormat?: string | null;
  mandatoryPurchaseTerms?: string | null;
  name?: string | null;
  shortDescription?: string | null;
}

export type AiTranslationFieldKey = 'description' | 'labelFormat' | 'mandatoryPurchaseTerms' | 'name' | 'shortDescription';

export interface AiSessionTypeFields {
  details?: string | null;
  instructions?: string | null;
  label?: string | null;
}

export type AiSessionTypeFieldKey = 'details' | 'instructions' | 'label';

export interface AiSessionTypeTranslation {
  fields: AiSessionTypeFields;
  id: number;
}

export interface AiSessionTypeTarget {
  field: AiSessionTypeFieldKey;
  sessionTypeId: number;
}

export interface AiSessionTypeTranslatedValue extends AiSessionTypeTarget {
  key: AiSessionTypeTargetKey;
  value: string;
}

export type AiSessionTypeTargetKey = `sessionType:${number}:${AiSessionTypeFieldKey}`;

export type AiTranslationTargetKey = AiSessionTypeTargetKey | AiTranslationFieldKey;

export type AiTranslationTrackedFieldType = AiTranslationFieldKey | 'sessionTypeDetails' | 'sessionTypeInstructions' | 'sessionTypeLabel';

export interface AiTranslatedSessionType {
  session_type_id: number;
  details?: unknown;
  instructions?: unknown;
  label?: unknown;
}

export type AiTranslationRating = 'down' | 'up';

export interface AiSessionTypeFieldView {
  disabled: boolean;
  field: AiSessionTypeFieldKey;
  key: AiSessionTypeTargetKey;
  loading: boolean;
  rating: AiTranslationRating | null;
  sessionTypeId: number;
  showRating: boolean;
}

export interface AiTranslatedContent {
  description?: unknown;
  label_format?: unknown;
  mandatory_purchase_terms?: unknown;
  name?: unknown;
  session_types?: unknown;
  short_description?: unknown;
}

export type AiTranslationScope = 'all' | 'field';

export interface AiTranslationGeneration {
  isRetranslate: boolean;
  model: string;
  scope: AiTranslationScope;
  translationOrderId: string;
}

export const AI_TRANSLATION_FIELD_KEYS: readonly AiTranslationFieldKey[] = [
  'name',
  'description',
  'shortDescription',
  'labelFormat',
  'mandatoryPurchaseTerms',
];

export const aiSessionTypeFieldKeys: readonly AiSessionTypeFieldKey[] = ['label', 'details', 'instructions'];

export interface AiTranslationRequest {
  fields: AiTranslationFields;
  partnerId: number;
  planId: number;
  sessionTypes: readonly AiSessionTypeTranslation[];
  sourceLocale: string;
  targetLocale: string;
}

export interface AiTranslationResult {
  fields: AiTranslationFields;
  model: string;
  sessionTypes: readonly AiSessionTypeTranslation[];
  translationOrderId: string;
}

export interface StartPlanAiTranslationResponse {
  translationOrderId: string;
}

export interface GetPlanAiTranslationOrderResponse {
  errorMessage?: string;
  model?: string;
  status: string;
  translatedText?: string;
  translationOrderId: string;
}
