/**
 * Context for the `ignt-table-parent-row` template.
 * Supports both named (let-item, let-isExpanded, let-toggle) and $implicit (let-parent) usage.
 */
export interface IgntTableParentRowContext<TItem> {
  /** Same as item; use let-parent for parent-centric templates. */
  $implicit: TItem;
  /** 0-based index of this parent among the top-level rows. */
  index: number;
  /** True when the parent can be toggled: it holds sub rows, `getRowCanExpand` allows it before they load, or the host keeps it expanded. */
  isExpandable: boolean;
  /** True while the parent's sub rows are visible. */
  isExpanded: boolean;
  /** Parent row data (same type as $implicit). */
  item: TItem;
  /** Text the built-in parent row would show: the parent's value in the label column, empty when that value is not a primitive. */
  label: string;
  /** Number of sub rows this parent holds; 0 for a childless parent. */
  subRowCount: number;
  /** Expands the parent when collapsed, collapses it when expanded. */
  toggle: () => void;
}
