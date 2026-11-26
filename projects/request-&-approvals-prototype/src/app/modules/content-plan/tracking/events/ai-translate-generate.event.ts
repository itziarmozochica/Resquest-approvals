import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { AiTranslationScope, AiTranslationTrackedFieldType } from '../../models/ai-translation.model';
import { TranslationsContextData } from '../../models/translations-tracking.model';

export interface AiTranslateGenerateData extends TranslationsContextData {
  channelId: string | null;
  fieldTypes: readonly AiTranslationTrackedFieldType[];
  isRetranslate: boolean;
  scope: AiTranslationScope;
  sourceLanguage: string;
  targetLanguage: string;
  translationOrderId: string;
}

export const aiTranslateGenerate = defineEvent<AiTranslateGenerateData>('ai.translate.generate');
