import { DestroyRef, EnvironmentProviders, InjectionToken, makeEnvironmentProviders, type Signal } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

/**
 * Registers a multi `Signal<T>` layer for an Ignite translation token (e.g. `IGNT_TABLE_TRANSLATIONS`).
 * `TranslateService` and `DestroyRef` are wired automatically.
 */
export function provideIgniteTranslations<T>(
  token: InjectionToken<Signal<Partial<T>>>,
  useFactory: (translate: TranslateService, destroyRef: DestroyRef) => Signal<Partial<T>>,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      deps: [TranslateService, DestroyRef],
      multi: true,
      provide: token,
      useFactory,
    },
  ]);
}
