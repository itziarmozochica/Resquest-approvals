import { TranslateService } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';

import { SUPPORTED_LANGUAGES } from '../../shared/constants/supported-translations-languages';

/** Prototype: the interface is always shown in English, whatever the browser language is. */
const PROTOTYPE_LANGUAGE = 'en';

export function i18nInitializer(translateService: TranslateService): () => Promise<void> {
  return (): Promise<void> => {
    translateService.setDefaultLang(PROTOTYPE_LANGUAGE);
    translateService.addLangs([...SUPPORTED_LANGUAGES]);
    return lastValueFrom(translateService.use(PROTOTYPE_LANGUAGE));
  };
}
