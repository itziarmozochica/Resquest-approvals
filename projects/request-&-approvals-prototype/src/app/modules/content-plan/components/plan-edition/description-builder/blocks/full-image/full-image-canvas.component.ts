import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { resolvePlaceholder } from '../_shared/placeholder.util';
import { BlockOf } from '../../models/block.model';
import { FULL_IMAGE_BLOCK } from './full-image.definition';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'app-db-full-image-canvas',
  standalone: true,
  styleUrl: './full-image-canvas.component.scss',
  templateUrl: './full-image-canvas.component.html',
})
export class FullImageCanvasComponent {
  readonly block = input.required<BlockOf<'fullImage'>>();
  /** Editor-only: muted hints over empty slots. MUST stay `false` for export. */
  readonly showPlaceholders = input<boolean>(false);

  /** Palette label — reused as the editor-only caption of the empty image slot. */
  readonly LABEL_KEY = FULL_IMAGE_BLOCK.labelKey;

  readonly #translate = inject(TranslateService, { optional: true });

  placeholderFor(key: string): string {
    return resolvePlaceholder(this.#translate, this.showPlaceholders(), key);
  }
}
