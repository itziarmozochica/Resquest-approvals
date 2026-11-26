import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import { EventDetailsCanvasComponent } from '../../blocks/event-details/event-details-canvas.component';
import { FullImageCanvasComponent } from '../../blocks/full-image/full-image-canvas.component';
import { FullVideoCanvasComponent } from '../../blocks/full-video/full-video-canvas.component';
import { ImageGridCanvasComponent } from '../../blocks/image-grid/image-grid-canvas.component';
import { InfoCardCanvasComponent } from '../../blocks/info-card/info-card-canvas.component';
import { ParagraphCanvasComponent } from '../../blocks/paragraph/paragraph-canvas.component';
import { SpacerCanvasComponent } from '../../blocks/spacer/spacer-canvas.component';
import { TabsCanvasComponent } from '../../blocks/tabs/tabs-canvas.component';
import { TitleCanvasComponent } from '../../blocks/title/title-canvas.component';
import { Block, BlockProps } from '../../models/block.model';

/**
 * Thin dispatcher: renders a single description-builder block by handing it
 * to the block type's own canvas component (`blocks/<type>/<type>-canvas.*`).
 * All per-type markup, styles and behavior live in those components — adding
 * a new block type means adding ONE `@case` here plus the block folder.
 *
 * The public contract is stable on purpose: selector `app-db-block-content`,
 * inputs `block`/`showPlaceholders` and output `propsChange` are consumed by
 * the builder canvas (the live, editable preview). The published description
 * is rendered server-side from the structured schema.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `None` so the SHARED block rules in this component's SCSS
  // (`.block-text-placeholder`, the image-slot `.placeholder`, the rich-text
  // `p` reset) cascade into the per-block canvas children, which render the
  // markup these rules target. Selectors are namespaced (`block-*`), so the
  // global scope is collision-safe.
  encapsulation: ViewEncapsulation.None,
  imports: [
    TitleCanvasComponent,
    ParagraphCanvasComponent,
    SpacerCanvasComponent,
    FullImageCanvasComponent,
    FullVideoCanvasComponent,
    ImageGridCanvasComponent,
    EventDetailsCanvasComponent,
    InfoCardCanvasComponent,
    TabsCanvasComponent,
  ],
  selector: 'app-db-block-content',
  standalone: true,
  styleUrl: './block-content.component.scss',
  templateUrl: './block-content.component.html',
})
export class BlockContentComponent {
  readonly block = input.required<Block>();
  /**
   * Editor-only affordance: when `true`, empty text props render a muted,
   * localised hint ("Add a title", …) so operators can see what's missing.
   */
  readonly showPlaceholders = input<boolean>(false);
  readonly propsChange = output<BlockProps>();
}
