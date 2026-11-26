/**
 * Context for ignt-table-column custom cell template.
 * Supports both named (let-item, let-value, let-index) and $implicit (let-row) usage.
 */
export interface IgntTableCellContext<TItem, TValue = unknown> {
  /** Same as item; use let-row for row-centric templates (e.g. let-p). */
  $implicit: TItem;
  /** 0-based position of the row in `data`, counting a parent's children in order and skipping the parents themselves. Same numbering as `rowInteraction.index`. */
  index: number;
  /** Row data (same type as $implicit). */
  item: TItem;
  /** Cell value for this column (TData[Key]). */
  value: TValue;
}
