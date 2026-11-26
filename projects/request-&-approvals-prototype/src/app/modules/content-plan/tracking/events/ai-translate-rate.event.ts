import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { AiTranslationRating, AiTranslationScope, AiTranslationTrackedFieldType } from '../../models/ai-translation.model';
import { TranslationsContextData } from '../../models/translations-tracking.model';

export interface AiTranslateRateData extends TranslationsContextData {
  channelId: string | null;
  fieldType: AiTranslationTrackedFieldType;
  isRetranslate: boolean;
  model: string;
  rating: AiTranslationRating;
  scope: AiTranslationScope;
  sourceLanguage: string;
  targetLanguage: string;
  translationOrderId: string;
}

export const aiTranslateRate = defineEvent<AiTranslateRateData>('ai.translate.rate');
