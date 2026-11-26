import { inject, NgModule } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IgntIconService } from '@ignite/icon';

/**
 * @deprecated Please use IgntIconComponent instead.
 *
 * @see {@link https://design-components.fevertools.com/index.html?path=/docs/components-communication-icon--docs}
 *
 * Icons are now registered in the following files:
 *  - solid: {@link (internal repository)
 *  - regular: {@link (internal repository)
 *  - light: {@link (internal repository)
 *  - duotone: {@link (internal repository)
 *
 *
 */
@NgModule({
  exports: [FontAwesomeModule],
  imports: [FontAwesomeModule],
})
export class IconsModule {
  readonly #igntIconService = inject(IgntIconService);
  constructor() {
    this.#igntIconService.preloadAllSets();
  }
}
