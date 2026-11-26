import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { resolvePlaceholder } from '../_shared/placeholder.util';
import { BlockOf } from '../../models/block.model';
import { TITLE_I18N } from './title.i18n-keys';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Class names are globally unique (`block-title-*`); `None` lets the shared
  // block rules cascade in. The host renders as `display: contents` in the
  // editor (see the SCSS).
  encapsulation: ViewEncapsulation.None,
  selector: 'app-db-title-canvas',
  standalone: true,
  styleUrl: './title-canvas.component.scss',
  templateUrl: './title-canvas.component.html',
})
export class TitleCanvasComponent {
  readonly block = input.required<BlockOf<'title'>>();
  /** Editor-only: muted hints over empty text props. MUST stay `false` for export. */
  readonly showPlaceholders = input<boolean>(false);

  readonly KEYS = TITLE_I18N;

  readonly #translate = inject(TranslateService, { optional: true });

  placeholderFor(key: string, params?: Record<string, unknown>): string {
    return resolvePlaceholder(this.#translate, this.showPlaceholders(), key, params);
  }
}
