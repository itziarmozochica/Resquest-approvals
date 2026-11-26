import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TranslationCacheService {
  #currentLang = '';
  #destroyRef = inject(DestroyRef);
  #isLoading = false;
  #translate = inject(TranslateService);
  #translations$ = new BehaviorSubject<Record<string, unknown> | null>(null);

  constructor() {
    this.#currentLang = this.#translate.currentLang || '';
    if (this.#currentLang) {
      this.#loadTranslations(this.#currentLang);
    }

    this.#translate.onLangChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(event => {
      this.#currentLang = event.lang;
      this.#translations$.next(event.translations as Record<string, unknown>);
      this.#isLoading = false;
    });

    this.#translate.onTranslationChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(event => {
      if (event.lang !== this.#currentLang) {
        return;
      }
      this.#translations$.next(event.translations as Record<string, unknown>);
    });
  }

  changes$(): Observable<Record<string, unknown> | null> {
    return this.#translations$.asObservable();
  }

  get translations(): Record<string, unknown> | null {
    return this.#translations$.value;
  }

  ensureLoaded(): void {
    if (!this.#currentLang) {
      this.#currentLang = this.#translate.currentLang || '';
    }

    if (this.#currentLang && !this.#translations$.value && !this.#isLoading) {
      this.#loadTranslations(this.#currentLang);
    }
  }

  #loadTranslations(lang: string): void {
    const requestedLang = lang;
    this.#isLoading = true;
    this.#translate
      .getTranslation(lang)
      .pipe(
        take(1),
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => {
          this.#isLoading = false;
        }),
      )
      .subscribe(translations => {
        if (requestedLang !== this.#currentLang) {
          return;
        }

        this.#translations$.next(translations);
      });
  }
}
