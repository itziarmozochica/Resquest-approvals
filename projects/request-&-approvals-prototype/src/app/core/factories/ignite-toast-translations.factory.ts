import { DestroyRef, type Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import type { IgntToastTranslations } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

export function igntToastTranslationsRootFactory(
  translate: TranslateService,
  destroyRef: DestroyRef,
): Signal<Partial<IgntToastTranslations>> {
  const resolveTranslations = (): Partial<IgntToastTranslations> => ({
    closeButtonAriaLabel: translate.instant('common.close'),
  });
  const translations$: Observable<Partial<IgntToastTranslations>> = translate.onLangChange.pipe(
    map(resolveTranslations),
    takeUntilDestroyed(destroyRef),
  );

  return toSignal<Partial<IgntToastTranslations>, Partial<IgntToastTranslations>>(translations$, {
    initialValue: resolveTranslations(),
  });
}
