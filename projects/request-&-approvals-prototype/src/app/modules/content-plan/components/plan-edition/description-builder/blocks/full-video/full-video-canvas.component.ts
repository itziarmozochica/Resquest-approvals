import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { resolvePlaceholder } from '../_shared/placeholder.util';
import { BlockOf } from '../../models/block.model';
import { FULL_VIDEO_BLOCK } from './full-video.definition';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'app-db-full-video-canvas',
  standalone: true,
  styleUrl: './full-video-canvas.component.scss',
  templateUrl: './full-video-canvas.component.html',
})
export class FullVideoCanvasComponent {
  readonly block = input.required<BlockOf<'fullVideo'>>();
  /** Editor-only: muted hints over empty slots. MUST stay `false` for export. */
  readonly showPlaceholders = input<boolean>(false);

  /** Palette label — reused as the editor-only caption of the empty video slot. */
  readonly LABEL_KEY = FULL_VIDEO_BLOCK.labelKey;

  readonly #translate = inject(TranslateService, { optional: true });

  placeholderFor(key: string): string {
    return resolvePlaceholder(this.#translate, this.showPlaceholders(), key);
  }
}
