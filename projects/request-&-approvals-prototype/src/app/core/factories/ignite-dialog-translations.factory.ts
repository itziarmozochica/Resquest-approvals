import { DestroyRef, type Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import type { IgntDialogTranslations } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

export function igntDialogTranslationsRootFactory(
  translate: TranslateService,
  destroyRef: DestroyRef,
): Signal<Partial<IgntDialogTranslations>> {
  const resolveTranslations = (): Partial<IgntDialogTranslations> => ({
    cancelButton: translate.instant('common.cancel'),
    closeAriaLabel: translate.instant('common.close'),
    okButton: translate.instant('common.ok'),
  });
  const translations$: Observable<Partial<IgntDialogTranslations>> = translate.onLangChange.pipe(
    map(resolveTranslations),
    takeUntilDestroyed(destroyRef),
  );

  return toSignal<Partial<IgntDialogTranslations>, Partial<IgntDialogTranslations>>(translations$, {
    initialValue: resolveTranslations(),
  });
}
