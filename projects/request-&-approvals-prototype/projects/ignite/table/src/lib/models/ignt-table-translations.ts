/** Parameters passed to the pagination "of" callback for interpolation. */
export interface IgntTablePaginationOfParams {
  from: number;
  to: number;
  total: number;
}

/** Callback to translate the pagination range (e.g. "1 - 10 of 25") with full control over from/to/total. */
export type IgntTablePaginationOfFn = (params: IgntTablePaginationOfParams) => string;

/** Callback for the toolbar filter button label when filters are active. */
export type IgntTableFilterActiveButtonLabelFn = (count: number) => string;

/** Callback for the sortable column header button aria-label. */
export type IgntTableSortColumnAriaLabelFn = (params: { column: string; direction: 'asc' | 'desc' | 'none' }) => string;

/**
 * Literals for table UI: empty state, pagination label, card expand labels.
 * All keys optional: provide only overrides via `IGNT_TABLE_TRANSLATIONS`; `IgntTableTranslationsDirective` merges them with the library defaults.
 */
export interface IgntTableTranslations {
  /** Active filters clear all button label. */
  clearAllLabel?: string;

  emptyMessage?: string;

  /** Toolbar filter button label when filters are active (full string; only `count` is interpolated). */
  filterActiveButtonLabel?: IgntTableFilterActiveButtonLabelFn;

  /** Toolbar filter button label when no filters are active. */
  filterLabel?: string;

  /** Callback that receives { from, to, total } and returns the pagination range string (e.g. "1 - 10 of 25"). */
  paginationOf?: IgntTablePaginationOfFn;

  /** Toolbar search translations*/
  searchHelperText?: string;
  searchLabel?: string;

  seeLess?: string;
  seeMore?: string;
  /** Sortable column header button aria-label. */
  sortColumnAriaLabel?: IgntTableSortColumnAriaLabelFn;
  /** 1-based row index for screen readers when rows are interactive. */
  interactiveRowAriaLabel?: (num: number) => string;
}

/** Effective copy after merging defaults and all `IGNT_TABLE_TRANSLATIONS` layers (every field is set). */
export type ResolvedIgntTableTranslations = Required<IgntTableTranslations>;
