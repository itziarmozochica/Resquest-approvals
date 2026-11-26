import { mixpanelMapper } from '@fz/fz-tracking/src/public-api';

import { TranslationsContextData, TranslationsErrorPayload } from '../models/translations-tracking.model';
import { addTranslations } from './events/add-translations.event';
import { aiTranslateGenerate } from './events/ai-translate-generate.event';
import { aiTranslateRate } from './events/ai-translate-rate.event';
import { aiTranslateRequest } from './events/ai-translate-request.event';
import { deleteTranslations } from './events/delete-translations.event';
import { errorTranslations } from './events/error-translations.event';
import { saveTranslations } from './events/save-translations.event';
import { viewTranslations } from './events/view-translations.event';

const mapTranslationsContext = ({ partnerId, planId }: TranslationsContextData) => ({
  partner_id: partnerId,
  plan_id: planId,
});

const mapChannelLanguagePayload = ({ channelId, languageCode }: { channelId: string | null; languageCode: string | null }) => ({
  channel_id: channelId,
  language_code: languageCode,
});

const mapAiLanguagePayload = ({ sourceLanguage, targetLanguage }: { sourceLanguage: string; targetLanguage: string }) => ({
  source_language: sourceLanguage,
  target_language: targetLanguage,
});

const mapErrorPayload = ({ channelId, errorMessage, errorType, field, languageCode, operation }: TranslationsErrorPayload) => ({
  channel_id: channelId,
  error_message: errorMessage,
  error_type: errorType,
  field,
  language_code: languageCode,
  operation,
});

export const contentPlanTranslationsMixpanelMappers = mixpanelMapper([
  {
    event: viewTranslations,
    name: 'FZ|Translations|View',
    properties: mapTranslationsContext,
  },
  {
    event: addTranslations,
    name: 'FZ|Translations|Add',
    properties: data => ({
      ...mapTranslationsContext(data),
      ...mapChannelLanguagePayload(data),
    }),
  },
  {
    event: saveTranslations,
    name: 'FZ|Translations|Save',
    properties: data => ({
      ...mapTranslationsContext(data),
      ...mapChannelLanguagePayload(data),
    }),
  },
  {
    event: deleteTranslations,
    name: 'FZ|Translations|Delete',
    properties: data => ({
      ...mapTranslationsContext(data),
      ...mapChannelLanguagePayload(data),
    }),
  },
  {
    event: errorTranslations,
    name: 'FZ|Translations|Error',
    properties: data => ({
      ...mapTranslationsContext(data),
      ...mapErrorPayload(data),
    }),
  },
  {
    event: aiTranslateGenerate,
    name: 'FZ|Translations|Ai_Translate_Generate',
    properties: ({
      channelId,
      fieldTypes,
      isRetranslate,
      partnerId,
      planId,
      sourceLanguage,
      targetLanguage,
      translationOrderId,
      ...rest
    }) => ({
      ...mapTranslationsContext({ partnerId, planId }),
      ...mapAiLanguagePayload({ sourceLanguage, targetLanguage }),
      channel_id: channelId,
      field_types: fieldTypes,
      is_retranslate: isRetranslate,
      translation_order_id: translationOrderId,
      ...rest,
    }),
  },
  {
    event: aiTranslateRequest,
    name: 'FZ|Translations|Ai_Translate_Request',
    properties: ({ channelId, fieldTypes, isRetranslate, partnerId, planId, sourceLanguage, targetLanguage, ...rest }) => ({
      ...mapTranslationsContext({ partnerId, planId }),
      ...mapAiLanguagePayload({ sourceLanguage, targetLanguage }),
      channel_id: channelId,
      field_types: fieldTypes,
      is_retranslate: isRetranslate,
      ...rest,
    }),
  },
  {
    event: aiTranslateRate,
    name: 'FZ|Translations|Ai_Translate_Rate',
    properties: ({
      channelId,
      fieldType,
      isRetranslate,
      partnerId,
      planId,
      sourceLanguage,
      targetLanguage,
      translationOrderId,
      ...rest
    }) => ({
      ...mapTranslationsContext({ partnerId, planId }),
      ...mapAiLanguagePayload({ sourceLanguage, targetLanguage }),
      channel_id: channelId,
      field_type: fieldType,
      is_retranslate: isRetranslate,
      translation_order_id: translationOrderId,
      ...rest,
    }),
  },
]);
