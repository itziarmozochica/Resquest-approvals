import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { TranslationsContextData } from '../../models/translations-tracking.model';

export interface AddTranslationsData extends TranslationsContextData {
  channelId: string | null;
  languageCode: string | null;
}

export const addTranslations = defineEvent<AddTranslationsData>('add.translations');
