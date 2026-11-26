import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { TranslationsContextData } from '../../models/translations-tracking.model';

export interface DeleteTranslationsData extends TranslationsContextData {
  channelId: string | null;
  languageCode: string | null;
}

export const deleteTranslations = defineEvent<DeleteTranslationsData>('delete.translations');
