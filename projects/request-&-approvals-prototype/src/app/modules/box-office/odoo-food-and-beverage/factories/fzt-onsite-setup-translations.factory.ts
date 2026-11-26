import { DestroyRef, type Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { type FztOnsiteSetupTranslations } from '@fz/ticketing-ui';
import { TranslateService } from '@ngx-translate/core';
import { map, type Observable } from 'rxjs';

export function resolveFztOnsiteSetupTranslations(translate: TranslateService): FztOnsiteSetupTranslations {
  return {
    activeShiftMessage: translate.instant('oneStopShop.onsiteSetupModal.activeShiftMessage'),
    closeSearch: translate.instant('oneStopShop.search.close'),
    greetingsSubtitle: translate.instant('oneStopShop.onsiteSetupModal.greetings.subtitle'),
    greetingsTitle: translate.instant('oneStopShop.onsiteSetupModal.greetings.title'),
    recent: translate.instant('oneStopShop.onsiteSetupModal.recent'),
    search: translate.instant('oneStopShop.onsiteSetupModal.search'),
    searchVenue: translate.instant('oneStopShop.onsiteSetupModal.searchVenue'),
    searchVenuePlaceholder: translate.instant('oneStopShop.onsiteSetupModal.searchVenuePlaceholder'),
    selectOnsiteSetup: translate.instant('oneStopShop.onsiteSetupModal.selectOnsiteSetup'),
    selectVenue: translate.instant('oneStopShop.onsiteSetupModal.selectVenue'),
    title: translate.instant('oneStopShop.onsiteSetupModal.title'),
  };
}

export function fztOnsiteSetupTranslationsFactory(translate: TranslateService, destroyRef: DestroyRef): Signal<FztOnsiteSetupTranslations> {
  const translations$: Observable<FztOnsiteSetupTranslations> = translate.onLangChange.pipe(
    map(() => resolveFztOnsiteSetupTranslations(translate)),
    takeUntilDestroyed(destroyRef),
  );

  return toSignal(translations$, { initialValue: resolveFztOnsiteSetupTranslations(translate) });
}
