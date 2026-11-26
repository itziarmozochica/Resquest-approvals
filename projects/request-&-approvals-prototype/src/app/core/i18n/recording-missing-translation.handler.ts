import { inject, Injectable } from '@angular/core';

import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';

import { TranslationKeyRecorderService } from './translation-key-recorder.service';

@Injectable()
export class RecordingMissingTranslationHandler implements MissingTranslationHandler {
  static readonly keyNamePattern = /^[\w-]+(\.[^.\s][^.]*)+$/u;

  readonly #translationKeyRecorder = inject(TranslationKeyRecorderService);

  handle(params: MissingTranslationHandlerParams): string {
    const { currentLang, defaultLang, translations } = params.translateService;
    const hasLoadedTranslations = translations[currentLang] !== undefined && translations[defaultLang] !== undefined;

    if (hasLoadedTranslations && RecordingMissingTranslationHandler.keyNamePattern.test(params.key)) {
      this.#translationKeyRecorder.recordMissing(params.key);
    }

    return params.key;
  }
}
