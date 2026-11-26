import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

import { BlockOf } from '../../models/block.model';

/**
 * Editor-only rendition of a spacer: dashed borders + "Xpx" label are an
 * editing affordance. The export never renders this component — the spacer's
 * published form is a bare `<div style="height: Xpx">` (see the export path).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'app-db-spacer-canvas',
  standalone: true,
  styleUrl: './spacer-canvas.component.scss',
  templateUrl: './spacer-canvas.component.html',
})
export class SpacerCanvasComponent {
  readonly block = input.required<BlockOf<'spacer'>>();
  /** Accepted for dispatcher uniformity; the spacer has no text placeholders. */
  readonly showPlaceholders = input<boolean>(false);
}
