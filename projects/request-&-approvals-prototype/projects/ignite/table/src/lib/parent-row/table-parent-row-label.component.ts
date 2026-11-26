import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

/**
 * Default contents of a parent row: chevron, label and child count.
 *
 * Rendered whenever `[subRows]` is set and no `ignt-table-parent-row` template is projected, so a
 * nested table needs no hand-written row. The chevron appears only when the parent can be toggled —
 * it has children, or `isExpandable` says so before they load — matching the row's own toggle affordance.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'ignt-table-parent-row-label',
  standalone: true,
  styleUrl: './table-parent-row-label.component.scss',
  templateUrl: './table-parent-row-label.component.html',
})
export class IgntTableParentRowLabelComponent {
  readonly isExpandable = input<boolean | undefined>(undefined);
  readonly isExpanded = input(false);
  readonly label = input('');
  readonly subRowCount = input(0);
}
