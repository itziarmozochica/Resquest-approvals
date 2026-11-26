import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { type I18nDirection } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

/**
 * Languages that use Right-to-Left (RTL) text direction.
 * ar = Arabic, he = Hebrew, fa = Persian/Farsi, ur = Urdu
 */
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'] as const;

/**
 * Service that manages text direction based on the current language.
 * Integrates with TranslateService to automatically detect RTL languages.
 */
@Injectable({
  providedIn: 'root',
})
export class DirectionService {
  #translateService = inject(TranslateService);

  /**
   * Signal for the current direction.
   * This signal is updated when the language changes.
   */
  readonly direction = toSignal<I18nDirection>(
    this.#translateService.onLangChange.pipe(
      map(event => this.getDirection(event.lang)),
      startWith(this.getDirection(this.#translateService.currentLang || this.#translateService.defaultLang || 'en')),
    ),
    {
      requireSync: true,
    },
  );

  /**
   * Gets the direction for a given language code.
   * @param lang - Language code
   * @returns 'rtl' for RTL languages, 'ltr' otherwise
   */
  getDirection(lang: string): I18nDirection {
    return this.#isRtl(lang) ? 'rtl' : 'ltr';
  }

  #isRtl(lang: string): boolean {
    const langCode = lang.split('-')[0].toLowerCase();
    return RTL_LANGUAGES.includes(langCode as (typeof RTL_LANGUAGES)[number]);
  }
}
