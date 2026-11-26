import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { AiTranslationScope, AiTranslationTrackedFieldType } from '../../models/ai-translation.model';
import { TranslationsContextData } from '../../models/translations-tracking.model';

export interface AiTranslateRequestData extends TranslationsContextData {
  channelId: string | null;
  fieldTypes: readonly AiTranslationTrackedFieldType[];
  isRetranslate: boolean;
  scope: AiTranslationScope;
  sourceLanguage: string;
  targetLanguage: string;
}

export const aiTranslateRequest = defineEvent<AiTranslateRequestData>('ai.translate.request');
