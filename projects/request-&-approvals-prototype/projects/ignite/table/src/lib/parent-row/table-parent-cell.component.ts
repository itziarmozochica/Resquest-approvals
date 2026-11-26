import { ChangeDetectionStrategy, Component, contentChild, input, TemplateRef } from '@angular/core';

import type { IgntTableColumnType, IgntTableParentRowContext, IgntTableRowData } from '../models';

/**
 * Per-column cell of a parent row (layer 2 – configuration).
 *
 * Purely declarative: projects the template rendered in one column of a nested table's parent row,
 * so a parent can summarise its children under the same headers they use. Declare it inside
 * `ignt-table-parent-row`, which keeps its own template for the primary column.
 *
 * Target a column with `key`; columns declared without one (typically the action column) are
 * targeted with `columnType`. A parent cell that names neither is dropped. Columns left untargeted
 * render an empty parent cell. Declaring no parent cell at all keeps the parent row template spanning
 * the full table width.
 *
 * The projected template receives the same context as the parent row template — item, index,
 * isExpanded, subRowCount and toggle.
 *
 * ### When to use
 * - The parent row needs values aligned to the table's columns — e.g. the capacity range shared by
 *   every asset inside an asset type, sitting under the Capacity header.
 *
 * ### When NOT to use
 * - The parent row is a single full-width banner → the parent row template already spans it.
 * - The value belongs to one child row → use the column's own cell template.
 *
 * ### Related
 * - [Table](?path=/docs/components-data-visualization-table--docs) — the nested table
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ignt-table-parent-cell',
  standalone: true,
  template: '<ng-content />',
})
export class IgntTableParentCellComponent {
  /** Type of the column this cell fills. Use for columns declared without a key, e.g. columnType="action". Ignored when key is set. */
  readonly columnType = input<IgntTableColumnType>();

  /** Key of the column this cell fills, matching the `key` of an `ignt-table-column`. */
  readonly key = input<string>();

  /** Cell template; context: item, index, isExpanded, subRowCount, toggle. Use [igntTableParentRowTemplateType] for typed context. */
  readonly cellTemplate = contentChild<TemplateRef<IgntTableParentRowContext<IgntTableRowData>>>(TemplateRef);
}
