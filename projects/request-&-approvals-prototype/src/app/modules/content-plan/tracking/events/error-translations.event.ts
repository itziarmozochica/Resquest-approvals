import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { TranslationsContextData, TranslationsErrorPayload } from '../../models/translations-tracking.model';

export type ErrorTranslationsData = TranslationsContextData & TranslationsErrorPayload;

export const errorTranslations = defineEvent<ErrorTranslationsData>('error.translations');
