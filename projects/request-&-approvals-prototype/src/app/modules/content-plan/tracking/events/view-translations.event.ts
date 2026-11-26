import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { TranslationsContextData } from '../../models/translations-tracking.model';

export type ViewTranslationsData = TranslationsContextData;

export const viewTranslations = defineEvent<ViewTranslationsData>('view.translations');
