import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from '@angular/core';

import { isHtmlMeaningful } from '@fz-original/app/modules/content-plan/utils/default-translation-field-catalog';
import { TranslateService } from '@ngx-translate/core';

import { resolvePlaceholder } from '../_shared/placeholder.util';
import { SHARED_BLOCK_I18N } from '../_shared/shared.i18n-keys';
import { BlockOf } from '../../models/block.model';
import { normalizeImageGridItems } from './image-grid.helpers';
import { IMAGE_GRID_I18N } from './image-grid.i18n-keys';
import { ImageGridItem } from './image-grid.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'app-db-image-grid-canvas',
  standalone: true,
  styleUrl: './image-grid-canvas.component.scss',
  templateUrl: './image-grid-canvas.component.html',
})
export class ImageGridCanvasComponent {
  readonly block = input.required<BlockOf<'imageGrid'>>();
  /** Editor-only: muted hints over empty text props. MUST stay `false` for export. */
  readonly showPlaceholders = input<boolean>(false);

  readonly KEYS = IMAGE_GRID_I18N;
  readonly SHARED_KEYS = SHARED_BLOCK_I18N;

  readonly #translate = inject(TranslateService, { optional: true });

  placeholderFor(key: string): string {
    return resolvePlaceholder(this.#translate, this.showPlaceholders(), key);
  }

  gridItems(): ImageGridItem[] {
    return normalizeImageGridItems(this.block().props.items);
  }

  /** Rich-text props: empty editors can leave markup like `<p></p>` behind. */
  hasRichText(html: string): boolean {
    return isHtmlMeaningful(html);
  }
}
