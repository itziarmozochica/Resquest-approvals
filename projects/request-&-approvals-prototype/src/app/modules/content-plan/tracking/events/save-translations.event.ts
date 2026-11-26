import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { TranslationsContextData } from '../../models/translations-tracking.model';

export interface SaveTranslationsData extends TranslationsContextData {
  channelId: string | null;
  languageCode: string;
}

export const saveTranslations = defineEvent<SaveTranslationsData>('save.translations');
