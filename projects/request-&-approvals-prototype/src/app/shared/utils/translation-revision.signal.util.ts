import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';
import { merge, scan } from 'rxjs';

/**
 * Tracks ngx-translate updates so computeds that use `TranslateService.instant()` re-run when
 * translations are loaded or the active language changes.
 *
 * Read the returned signal inside a `computed()` to register the dependency.
 */
export function translationRevisionSignal(translate: TranslateService): Signal<number> {
  return toSignal(
    merge(translate.onTranslationChange, translate.onLangChange, translate.onDefaultLangChange).pipe(
      scan((revision: number) => revision + 1, 0),
    ),
    { initialValue: 0 },
  );
}
