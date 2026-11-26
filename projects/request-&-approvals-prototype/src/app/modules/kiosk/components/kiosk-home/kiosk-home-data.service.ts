import { inject, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DatadogLogLevel } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { KioskOnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/kiosk-onsite-setup';
import { KioskCacheService } from '@fz-original/app/modules/kiosk/services/cache/kiosk-cache.service';
import { KioskLanguageService } from '@fz-original/app/modules/kiosk/services/kiosk-language.service';
import { KioskStorageService } from '@fz-original/app/modules/kiosk/services/kiosk-storage.service';
import { KioskPlansResult, KioskService } from '@fz-original/app/modules/kiosk/services/kiosk.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { defer, EMPTY, merge, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class KioskHomeDataService {
  readonly #kioskCacheService = inject(KioskCacheService);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  readonly #kioskService = inject(KioskService);
  readonly #kioskStorageService = inject(KioskStorageService);
  readonly #route = inject(ActivatedRoute);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  init(onError: (error: unknown) => void): Observable<KioskPlansResult> {
    return merge(
      this.#contained$(this.#refresh$(this.#resolveLanguage()), onError),
      this.#translateService.onLangChange.pipe(
        switchMap((event: LangChangeEvent) => this.#contained$(this.#plansLoad$(event.lang), onError)),
      ),
    );
  }

  keepWarm(): Observable<KioskPlansResult> {
    if (!this.#userService.isKioskUser()) {
      return EMPTY;
    }
    return this.#kioskService.timeAndRetry().pipe(switchMap(() => this.#refresh$(this.#resolveLanguage()).pipe(catchError(() => EMPTY))));
  }

  loadPlans(lang: string): Observable<KioskPlansResult> {
    return this.#plansLoad$(lang);
  }

  loadCurrentPlans(): Observable<KioskPlansResult> {
    return this.#plansLoad$(this.#resolveLanguage());
  }

  #contained$(load$: Observable<KioskPlansResult>, onError: (error: unknown) => void): Observable<KioskPlansResult> {
    return load$.pipe(
      catchError((error: unknown) => {
        onError(error);
        return EMPTY;
      }),
    );
  }

  #refresh$(lang: string): Observable<KioskPlansResult> {
    return this.#onsiteSetupLoad$().pipe(switchMap(() => this.#plansLoad$(lang)));
  }

  #onsiteSetupLoad$(): Observable<KioskOnsiteSetup> {
    if (!this.#userService.isKioskUser()) {
      return this.#fzPreviewLoad$();
    }
    const configuration = this.#kioskStorageService.getConfiguration();
    if (configuration === null) {
      return EMPTY;
    }
    return this.#kioskService.getOnsiteSetup(configuration);
  }

  #fzPreviewLoad$(): Observable<KioskOnsiteSetup> {
    const serial = this.#route.snapshot.queryParamMap.get('serial') || undefined;
    this.#kioskCacheService.clear();
    this.#kioskStorageService.setOnsiteSetup(undefined);
    this.#kioskService.logTrace('Home bootstrap — FZ preview path', DatadogLogLevel.Info, { mode: 'fz-preview', serial });
    return defer(() => this.#kioskService.getKioskConfigAndSetup({ serial }));
  }

  #plansLoad$(lang: string): Observable<KioskPlansResult> {
    return this.#kioskService.fetchPlansForCurrentVariant(lang);
  }

  #resolveLanguage(): string {
    const fromLangService = this.#kioskLanguageService.getLanguageCode();
    const fromSetup = this.#kioskStorageService.getOnsiteSetup()?.available_languages?.[0];
    return fromLangService ?? fromSetup ?? 'en';
  }
}
