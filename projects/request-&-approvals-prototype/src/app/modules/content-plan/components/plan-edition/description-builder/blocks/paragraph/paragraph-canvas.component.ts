import { ChangeDetectionStrategy, Component, inject, input, ViewEncapsulation } from '@angular/core';

import { isHtmlMeaningful } from '@fz-original/app/modules/content-plan/utils/default-translation-field-catalog';
import { TranslateService } from '@ngx-translate/core';

import { resolvePlaceholder } from '../_shared/placeholder.util';
import { BlockOf } from '../../models/block.model';
import { PARAGRAPH_I18N } from './paragraph.i18n-keys';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'app-db-paragraph-canvas',
  standalone: true,
  styleUrl: './paragraph-canvas.component.scss',
  templateUrl: './paragraph-canvas.component.html',
})
export class ParagraphCanvasComponent {
  readonly block = input.required<BlockOf<'paragraph'>>();
  /** Editor-only: muted hints over empty text props. MUST stay `false` for export. */
  readonly showPlaceholders = input<boolean>(false);

  readonly KEYS = PARAGRAPH_I18N;

  readonly #translate = inject(TranslateService, { optional: true });

  placeholderFor(key: string): string {
    return resolvePlaceholder(this.#translate, this.showPlaceholders(), key);
  }

  /** Rich-text props: empty editors can leave markup like `<p></p>` behind. */
  hasRichText(html: string): boolean {
    return isHtmlMeaningful(html);
  }
}
