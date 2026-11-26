import { ChangeDetectionStrategy, Component, contentChild, contentChildren, TemplateRef } from '@angular/core';

import type { IgntTableParentRowContext, IgntTableRowData } from '../models';
import { IgntTableParentCellComponent } from './table-parent-cell.component';

/**
 * Parent row definition for `ignt-table` (layer 2 – configuration).
 *
 * Purely declarative: projects the template used to render each top-level row when the table
 * is nested via `[subRows]`. The consumer owns the parent row's layout (label, counters, actions).
 *
 * By default the template is rendered in a single cell spanning every column. Add
 * `ignt-table-parent-cell` children to instead align the parent row to the column grid: this
 * template then fills the primary column and each parent cell fills the column it targets.
 *
 * ### When to use
 * - Rows arrive already nested (a parent object holding an array of children) and each parent
 *   needs its own header row — e.g. assets nested under their asset type.
 *
 * ### When NOT to use
 * - Flat rows that only need a sorted or paginated table → use `ignt-table-column` alone.
 * - A parent-row header that should scroll away → parent rows are ordinary body rows, not sticky headers.
 *
 * ### Related
 * - [Table](?path=/docs/components-data-visualization-table--docs) — the host table
 * - [Table](?path=/docs/components-data-visualization-table--docs) — nested rows in context
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ignt-table-parent-row',
  standalone: true,
  template: '<ng-content />',
})
export class IgntTableParentRowComponent {
  /** Per-column parent cells. When empty the parent row template spans every column. */
  readonly cells = contentChildren(IgntTableParentCellComponent);

  /** Parent row template; context: item, index, isExpanded, subRowCount, toggle. Use [igntTableParentRowTemplateType] for typed context. */
  readonly rowTemplate = contentChild<TemplateRef<IgntTableParentRowContext<IgntTableRowData>>>(TemplateRef, { descendants: false });
}
