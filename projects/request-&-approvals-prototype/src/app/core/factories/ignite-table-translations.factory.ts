import { DestroyRef, type Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import type { IgntTableTranslations } from '@ignite/table';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

export function resolveIgniteTableTranslations(translate: TranslateService): Partial<IgntTableTranslations> {
  return {
    clearAllLabel: translate.instant('common.filter.clearAll'),
    emptyMessage: translate.instant('common.noResults'),
    filterLabel: translate.instant('common.filter.label'),
    searchLabel: translate.instant('common.searchLabel'),
    seeLess: translate.instant('common.seeLess'),
    seeMore: translate.instant('common.seeMore'),
    filterActiveButtonLabel: (count: number) => translate.instant('common.filter.activeButtonLabel', { count }),
    interactiveRowAriaLabel: (num: number) => translate.instant('common.interactiveRowAriaLabel', { num }),
    paginationOf: ({ from, to, total }) => translate.instant('pagination.range', { end: to, start: from, total }),
  };
}

/** Root `useFactory` for default Ignite table copy bound to ngx-translate. */
export function igntTableTranslationsRootFactory(
  translate: TranslateService,
  destroyRef: DestroyRef,
): Signal<Partial<IgntTableTranslations>> {
  const translations$: Observable<Partial<IgntTableTranslations>> = translate.onLangChange.pipe(
    map(() => resolveIgniteTableTranslations(translate)),
    takeUntilDestroyed(destroyRef),
  );

  return toSignal(translations$, {
    initialValue: resolveIgniteTableTranslations(translate),
  });
}
