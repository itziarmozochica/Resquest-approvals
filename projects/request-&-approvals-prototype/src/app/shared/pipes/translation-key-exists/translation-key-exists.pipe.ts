import { ChangeDetectorRef, DestroyRef, inject, Pipe, PipeTransform } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslationCacheService } from '../../services/translation-cache/translation-cache.service';
import { hasTranslationKey } from '../../utils/translation.utils';

@Pipe({
  name: 'translationKeyExists',
  pure: false,
  standalone: true,
})
export class TranslationKeyExistsPipe implements PipeTransform {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #translationCache = inject(TranslationCacheService);

  constructor() {
    this.#translationCache
      .changes$()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#changeDetectorRef.markForCheck());
  }

  transform(key: string): boolean {
    if (!key) {
      return false;
    }

    this.#translationCache.ensureLoaded();
    return hasTranslationKey(this.#translationCache.translations, key);
  }
}
