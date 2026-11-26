import { DestroyRef, inject, Injectable, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { isString } from '../../../app/utils/ts/ts.util';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { KioskOnsiteSetup } from '../../box-office/shared/models/kiosk-onsite-setup';
import { LanguageResource } from '../models/language-resource.model';
import { DEFAULT_CURRENCY_LOCALE } from '../utils/currency-locale.util';
import { KioskStorageService } from './kiosk-storage.service';

const LANGUAGE_LOCALES_BY_COUNTRY: Record<string, Record<string, string>> = {
  BE: { nl: 'nl-BE' },
  MX: { es: 'es-MX' },
  US: { en: 'en-US' },
};

@Injectable({
  providedIn: 'root',
})
export class KioskLanguageService {
  #destroyRef = inject(DestroyRef);
  #kioskStorageService = inject(KioskStorageService);
  #languages: (string | LanguageResource)[] | null = null;
  #languagesSubject = new BehaviorSubject<(string | LanguageResource)[]>([]);
  #locale = signal<string>(DEFAULT_CURRENCY_LOCALE);
  #partnerService = inject(PartnerService);
  #translate = inject(TranslateService);

  /**
   * We need to keep track of the current language cause translate service is async and race conditions happens
   * @private
   */
  currentLanguage: string | LanguageResource | null = null;

  /**
   * The selected language as a formatting locale: the regional tag when the partner country has one for it
   * (`es` on a Mexican kiosk is `es-MX`), the bare language code otherwise.
   */
  readonly locale: Signal<string> = this.#locale.asReadonly();

  constructor() {
    this.#kioskStorageService
      .observeSetup()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((setup: KioskOnsiteSetup | null) => {
        if (!setup || !setup.available_languages || setup.available_languages.length === 0) {
          this.#setCurrentLanguage(null);
          return;
        }

        this.#languages = this.#processLanguagesWithLocales(setup.available_languages);
        const languageCode: string | null = this.getLanguageCode();
        const selected: string | LanguageResource | undefined = languageCode === null ? undefined : this.#findLanguage(languageCode);
        if (selected === undefined) {
          const firstLang: string | LanguageResource = this.#languages[0];
          this.#translate.setDefaultLang(this.#extractLanguageCode(firstLang));
          this.useLanguage(firstLang);
        } else {
          this.#setCurrentLanguage(selected);
        }
        this.#languagesSubject.next(this.#languages);
      });
  }

  getLanguageCodes(): string[] {
    return (this.#languages ?? []).map(lang => this.#extractLanguageCode(lang));
  }

  getLanguageCode(): string | null {
    if (this.currentLanguage === null) {
      return null;
    }
    return this.#extractLanguageCode(this.currentLanguage);
  }

  observeLanguages(): Observable<(string | LanguageResource)[]> {
    return this.#languagesSubject.asObservable();
  }

  /**
   * Switches back to the first language of the onsite setup, the most relevant one for the kiosk, so the next
   * customer does not inherit the language the previous one picked.
   */
  useDefaultLanguage(): void {
    const [defaultLanguage] = this.#languages ?? [];
    if (defaultLanguage !== undefined) {
      this.useLanguage(defaultLanguage);
    }
  }

  useLanguage(lang: string | LanguageResource): void {
    const langCode = this.#extractLanguageCode(lang);
    this.#translate.use(langCode);
    this.#setCurrentLanguage(this.#findLanguage(langCode) ?? lang);
  }

  #convertToLanguageResource(language: string, countryCode?: string): string | LanguageResource {
    if (countryCode && LANGUAGE_LOCALES_BY_COUNTRY[countryCode.toUpperCase()]?.[language]) {
      return {
        language,
        locale: LANGUAGE_LOCALES_BY_COUNTRY[countryCode.toUpperCase()][language],
      };
    }

    return language;
  }

  #extractLanguageCode(lang: string | LanguageResource): string {
    return isString(lang) ? lang : lang.language;
  }

  #extractLocale(lang: string | LanguageResource): string {
    return isString(lang) ? lang : lang.locale;
  }

  #findLanguage(languageCode: string): string | LanguageResource | undefined {
    return this.#languages?.find(lang => this.#extractLanguageCode(lang) === languageCode);
  }

  #processLanguagesWithLocales(languages: string[]): (string | LanguageResource)[] {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return languages;
    }

    return languages.map(lang => this.#convertToLanguageResource(lang, partner.countryCode));
  }

  #setCurrentLanguage(lang: string | LanguageResource | null): void {
    this.currentLanguage = lang;
    this.#locale.set(lang === null ? this.#translate.currentLang || DEFAULT_CURRENCY_LOCALE : this.#extractLocale(lang));
  }
}
