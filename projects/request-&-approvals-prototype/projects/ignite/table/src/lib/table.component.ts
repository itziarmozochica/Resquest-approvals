import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  isDevMode,
  model,
  output,
  signal,
  TemplateRef,
} from '@angular/core';

import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { IgntSkeletonComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton/ignt-skeleton.component';
import { createAngularTable, flexRenderComponent, FlexRenderDirective } from '@tanstack/angular-table';
import type {
  ColumnDef,
  ExpandedState,
  Header,
  PaginationState,
  Row,
  SortingState,
  Table,
  TableOptions,
  Updater,
} from '@tanstack/table-core';

import { IgntMediaQueriesService } from '../../../common/src/lib/media-queries/media-queries.service';
import { IgntTableActiveFiltersComponent } from './active-filters/table-active-filters.component';
import { IgntTableColumnComponent } from './column/table-column.component';
import { IgntTableFilterComponent } from './filter/ignt-table-filter.component';
import type {
  IgntTableCardRowView,
  IgntTableColumnMeta,
  IgntTableDesktopRowView,
  IgntTableFilterConfig,
  IgntTableHeaderGroupView,
  IgntTableHeaderView,
  IgntTableLayout,
  IgntTablePageChangeEvent,
  IgntTableParentCellView,
  IgntTableParentRowContext,
  IgntTableRowData,
  IgntTableRowInteractionEvent,
  IgntTableSearchConfig,
  IgntTableSortChangeEvent,
} from './models';
import { IgntTablePaginationComponent } from './pagination/table-pagination.component';
import { IgntTableParentRowLabelComponent } from './parent-row/table-parent-row-label.component';
import { IgntTableParentRowComponent } from './parent-row/table-parent-row.component';
import { IgntTableSearchComponent } from './search/ignt-table-search.component';
import { IgntTableSortTriggerComponent } from './sort/ignt-table-sort-trigger.component';
import { IgntTableCellOutletComponent } from './table-cell-outlet.component';
import { IgntTableTranslationsDirective } from './table-translations.directive';
import { buildIgntTableCardRowView } from './utils/table-card-view.util';
import {
  buildIgntTableCellContext,
  buildIgntTableDesktopCellView,
  igntTableCellContent,
  igntTableWidthStyleForColumnSize,
} from './utils/table-cell-view.util';
import { buildIgntTableHeaderView } from './utils/table-header-view.util';
import { buildIgntTableOptions } from './utils/table-options.util';
import {
  buildIgntTableDesktopRowViews,
  buildIgntTableParentCellViews,
  igntTableExpandedIdsFromState,
  igntTableExpandedStateFromIds,
  igntTableFlattenedRowIndex,
  igntTableFlattenedSubRowOffsets,
  igntTableHasUnsupportedNesting,
  igntTableParentLabelColumnId,
  igntTableParentRowLabel,
  resolveIgntTableParentCellTemplates,
  toggleIgntTableParentRow,
} from './utils/table-parent-row-view.util';
import { isSortingEqual, nextSortingFromUpdater } from './utils/table-sorting.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [IgntTableTranslationsDirective],
  imports: [
    FlexRenderDirective,
    NgTemplateOutlet,
    IgntSkeletonBaseComponent,
    IgntSkeletonComponent,
    IgntTableActiveFiltersComponent,
    IgntTableFilterComponent,
    IgntTablePaginationComponent,
    IgntTableParentRowLabelComponent,
    IgntTableSearchComponent,
    IgntTableSortTriggerComponent,
  ],
  selector: 'ignt-table',
  standalone: true,
  styleUrl: './table.component.scss',
  templateUrl: './table.component.html',
})
export class IgntTableComponent<TData extends IgntTableRowData> {
  readonly #translations = inject(IgntTableTranslationsDirective).translations;
  readonly #mediaQueriesService = inject(IgntMediaQueriesService);

  /** Table row data. With server-side pagination, this is the current page only. */
  readonly data = input.required<TData[]>();
  /**
   * Ids of the expanded parents, owned by the host. Left unset, the table owns the expanded state:
   * parents start expanded and every new `data` reference expands them all again. Once set, parents
   * not in the set render collapsed, toggling one updates the set, and a new `data` reference keeps it.
   * Pair it with `getRowId`, since the default ids are positional. A parent in the set stays expandable
   * while it has no sub rows, so it keeps its focus stop, chevron and `aria-expanded` while they load,
   * or once they load empty.
   */
  readonly expandedRowIds = model<ReadonlySet<string> | undefined>(undefined);
  readonly pageIndex = model<number>(0);

  /** Optional toolbar filter: `sidePanelContent` / `sidePanelOptions` are passed to `ignt-table-filter`, which opens the side panel. */
  readonly filterConfig = input<IgntTableFilterConfig | null>(null);

  /**
   * Lets a parent expand before its sub rows exist, so the host can load them when it does. Only widens
   * what can expand: a parent holding sub rows is always expandable. Desktop only: the card layout has
   * no parent rows to expand, so children loaded on expand never reach it; use it with `layout="table"`.
   */
  readonly getRowCanExpand = input<(item: TData) => boolean>();

  /** Stable id of a top-level row, used to key its expanded state. Defaults to its position in `data`. */
  readonly getRowId = input<(item: TData, index: number) => string>();
  /** When true, the toolbar search grows to fill the row left of the actions instead of taking a fixed share of the grid. */
  readonly hasFullWidthSearch = input(false, { transform: booleanAttribute });
  /** Enable client-side pagination. On a table with nested rows a page holds `pageSize` parents with all their children, not `pageSize` rows. */
  readonly hasPagination = input(false, { transform: booleanAttribute });
  /** Enable server-side pagination; use with pageIndex, totalRowCount (for page count and "of Z"), and paginationChange. */
  readonly hasServerSidePagination = input(false, { transform: booleanAttribute });
  /** When true, TanStack does not reorder rows; the host must refetch or refilter `data`. */
  readonly hasServerSideSorting = input(false, { transform: booleanAttribute });
  /**
   * When true, data rows are focusable and respond to pointer and keyboard (Enter/Space); `rowInteraction` emits on activation.
   * When false, rows are not interactive (no row-level handlers, focus ring, or role).
   */
  readonly interactiveRows = input(false, { transform: booleanAttribute });
  /** When true, shows a loading overlay. */
  readonly isLoading = input(false, { transform: booleanAttribute });

  /** Responsive layout: auto (table, cards on mobile), table or card at every width. */
  readonly layout = input<IgntTableLayout>('auto');

  /** Page size. */
  readonly pageSize = input<number>(10);

  /** Optional toolbar search (`searchQuery` lives on this object; parent updates it from `searchChanged`). */
  readonly searchConfig = input<IgntTableSearchConfig | null>(null);

  /** Controlled sorting state (TanStack: `[{ id, desc }]`). Empty = no sort. */
  readonly sorting = input<SortingState>([]);

  /**
   * Key of the property holding each row's child rows. Set it to nest the table: top-level rows
   * render through the projected `ignt-table-parent-row` template and their children render as
   * ordinary rows underneath. Parents start expanded, and a childless parent still renders its parent row.
   * A new `data` reference restores "all expanded", so keep `data` stable between reloads, or own the
   * expanded state with `expandedRowIds` and `getRowId`.
   * One level only — a child holding children of its own renders as a sibling of that child, so the
   * table warns in development instead. Desktop only: the card layout renders every child row flat,
   * with no parent rows, regardless of which parents are collapsed.
   */
  readonly subRows = input<Extract<keyof TData, string>>();

  /** Total row count for "X - Y of Z" and server-side page count (`ceil(total / pageSize)`). Required when hasServerSidePagination is true. */
  readonly totalRowCount = input<number | undefined>();

  /** Page count for TanStack manual pagination: `ceil(totalRowCount / pageSize)` (minimum 1). Client-side pagination uses TanStack built-in pagination row model instead. */
  readonly #serverSidePageCount = computed(() => {
    const total = this.totalRowCount();
    const pageSize = this.pageSize();
    if (pageSize <= 0) {
      return 1;
    }
    if (total === undefined || total < 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(total / pageSize));
  });
  /** Emitted when the user clears all active filter pills. */
  readonly filterClearAll = output();

  /** Emitted when the filter side panel closes (re-emits `ignt-table-filter`’s close payload from `IgntDialogRef.closed$`). */
  readonly filterClosed = output<unknown>();

  /** Emitted when the user removes one active filter pill. */
  readonly filterPillRemoved = output<{ id: string }>();

  /** Emitted when page changes (server-side). Payload pageIndex is 0-based. */
  readonly paginationChange = output<IgntTablePageChangeEvent>();

  /** Emitted when a data row is activated (full row click / Enter / Space) while `interactiveRows` is true. */
  readonly rowInteraction = output<IgntTableRowInteractionEvent<TData>>();

  /** Emitted after the search field value settles (debounced). */
  readonly searchChanged = output<string>();

  /** Emitted when sorting changes (server-side). Skip initial run like `paginationChange`. */
  readonly sortingChange = output<IgntTableSortChangeEvent>();

  protected readonly columnComponents = contentChildren(IgntTableColumnComponent);
  protected readonly parentRowComponent = contentChild(IgntTableParentRowComponent);
  protected readonly parentRowTemplate = computed(() => this.parentRowComponent()?.rowTemplate());
  readonly #expandedState = signal<ExpandedState>(true);
  readonly #expanded = computed<ExpandedState>(() => {
    const expandedRowIds = this.expandedRowIds();

    return expandedRowIds === undefined ? this.#expandedState() : igntTableExpandedStateFromIds(expandedRowIds);
  });
  /** Nested rows are active as soon as a sub-row key is given; the parent row template is optional. */
  readonly #hasNestedRows = computed(() => (this.subRows() ?? '') !== '');
  readonly #keysByPosition = computed(() => this.#hasNestedRows() && this.expandedRowIds() !== undefined && this.getRowId() === undefined);
  readonly #parentSubRowOffsets = computed<number[] | undefined>(() => {
    const subRowsKey = this.subRows();
    if (!this.#hasNestedRows() || subRowsKey === undefined) return undefined;

    return igntTableFlattenedSubRowOffsets({ data: this.data(), subRowsKey });
  });
  readonly #columnDefs = computed<ColumnDef<TData>[]>(() => {
    const cols = this.columnComponents();
    const defs = cols.map(col => {
      const def = col.columnDef();
      const meta = def.meta as IgntTableColumnMeta<TData> | undefined;
      const cellTemplateRef = meta?.cellTemplateRef;

      if (cellTemplateRef) {
        return {
          ...def,
          cell: (ctx: { row: Row<TData>; getValue: () => unknown }) =>
            flexRenderComponent(IgntTableCellOutletComponent<TData>, {
              inputs: {
                context: buildIgntTableCellContext({
                  getValue: ctx.getValue,
                  index: this.#flattenedRowIndex(ctx.row),
                  item: ctx.row.original,
                }),
                templateRef: cellTemplateRef,
              },
            }),
        };
      }
      return def;
    });
    return defs as ColumnDef<TData>[];
  });
  readonly #parentCellTemplates = computed(() =>
    resolveIgntTableParentCellTemplates<TData>({ cells: this.parentRowComponent()?.cells() ?? [], columnDefs: this.#columnDefs() }),
  );
  readonly #parentLabelColumnId = computed(() => igntTableParentLabelColumnId(this.#columnDefs()));
  readonly #clientPageIndex = signal(0);
  /** Last page index (used to detect changes and skip emitting on initial run). */
  readonly #lastPageIndex = signal<number | undefined>(undefined);
  /** Last sorting state (used to detect changes and skip emitting on initial run). */
  readonly #lastSorting = signal<SortingState | undefined>(undefined);
  readonly #prevPageSize = signal<number | undefined>(undefined);
  readonly #sortingState = signal<SortingState>([]);
  readonly #hasSortableColumns = computed(() => this.#columnDefs().some(def => def.enableSorting === true));
  #cachedTableColumnSignature = '';
  #cachedTableInstance: Table<TData> | null = null;
  protected readonly expandedCardRowIds = signal<Set<string>>(new Set());
  protected readonly isCardView = computed<boolean>(() => {
    if (this.layout() === 'card') return true;
    if (this.layout() === 'table') return false;

    return this.#mediaQueriesService.isMobile();
  });
  protected readonly table = computed<Table<TData> | null>(() => {
    const defs = this.#columnDefs();
    this.data();
    this.#sortingState();
    this.sorting();
    this.pageIndex();
    this.#clientPageIndex();
    this.pageSize();
    this.hasPagination();
    this.hasServerSidePagination();
    this.hasServerSideSorting();
    this.totalRowCount();
    this.subRows();
    this.getRowId();
    this.getRowCanExpand();
    this.#expanded();
    if (defs.length === 0) {
      this.#cachedTableInstance = null;
      this.#cachedTableColumnSignature = '';
      return null;
    }

    const columnSignature = defs.map(def => def.id ?? '').join('|');
    if (this.#cachedTableInstance === null || this.#cachedTableColumnSignature !== columnSignature) {
      this.#cachedTableInstance = createAngularTable<TData>(() => this.#tableOptions());
      this.#cachedTableColumnSignature = columnSignature;
    }

    return this.#cachedTableInstance;
  });

  /** Resolved translation: empty state message. */
  protected readonly emptyMessage = computed(() => this.#translations().emptyMessage);

  /** `role="button"` on rows when `interactiveRows` is enabled. */
  protected readonly rowInteractiveRole = computed(() => (this.interactiveRows() ? 'button' : null));
  /** `tabindex="0"` on rows when `interactiveRows` is enabled. */
  protected readonly rowInteractiveTabIndex = computed(() => (this.interactiveRows() ? 0 : null));

  /** Pagination state when table and pagination are active; null otherwise. */
  protected readonly paginationState = computed<{
    pageIndex: number;
    pageSize: number;
    totalRows: number;
  } | null>(() => {
    const table = this.table();
    if (!table || (!this.hasPagination() && !this.hasServerSidePagination())) return null;
    const pag = table.getState().pagination;
    const totalRows = this.totalRowCount() ?? table.getRowCount();
    return { pageIndex: pag.pageIndex, pageSize: pag.pageSize, totalRows };
  });

  /**
   * Pre-computed card row views for template (avoids method calls in card loop).
   * Tables with nested rows read the pre-expanded model so every child is listed flat, in sort order,
   * whatever the desktop parent rows are collapsed to.
   */
  protected readonly cardRowsData = computed<IgntTableCardRowView<TData>[]>(() => {
    const table = this.table();
    if (!table || !this.isCardView()) return [];
    const nested = this.#hasNestedRows();
    const rows = nested ? table.getPreExpandedRowModel().flatRows.filter(row => row.depth > 0) : table.getRowModel().rows;
    const expandedRowIds = this.expandedCardRowIds();
    const translations = this.#translations();

    return rows.map((row, index) =>
      buildIgntTableCardRowView({
        dataRowIndex: nested ? index : row.index,
        expandedRowIds,
        row,
        translations,
        getCellContent: cell => igntTableCellContent(cell),
      }),
    );
  });

  /** Pre-computed desktop header group views for template. */
  protected readonly headerGroupViews = computed<IgntTableHeaderGroupView<TData>[]>(() => {
    this.#sortingState();
    const table = this.table();
    if (!table) return [];
    return table.getHeaderGroups().map(headerGroup => ({
      headers: headerGroup.headers.map(header => this.#buildHeaderView(header)),
      id: headerGroup.id,
    }));
  });

  /** Pre-computed desktop table row views (body cells) for template. */
  protected readonly desktopRowsData = computed<IgntTableDesktopRowView<TData>[]>(() => {
    this.#sortingState();
    const table = this.table();
    if (!table) return [];
    const parentCellTemplates = this.#parentCellTemplates();

    return buildIgntTableDesktopRowViews({
      hasParentCells: parentCellTemplates.size > 0,
      nested: this.#hasNestedRows(),
      rows: table.getRowModel().rows,
      buildCellView: cell => buildIgntTableDesktopCellView(cell),
      buildParentCellViews: row => this.#buildParentCellViews(row, parentCellTemplates),
      parentLabelOf: row => igntTableParentRowLabel({ labelColumnId: this.#parentLabelColumnId(), row }),
    });
  });

  /** Table options for TanStack Table; recomputes when data, pagination, or sorting inputs change. */
  readonly #tableOptions = computed<TableOptions<TData>>(() =>
    buildIgntTableOptions<TData>({
      clientPageIndex: this.#clientPageIndex(),
      columns: this.#columnDefs(),
      data: this.data(),
      expanded: this.#expanded(),
      expandedRowIds: this.expandedRowIds(),
      getRowCanExpand: this.getRowCanExpand(),
      getRowId: this.getRowId(),
      nested: this.#hasNestedRows(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      pagination: this.hasPagination(),
      serverSidePageCount: this.#serverSidePageCount(),
      serverSidePagination: this.hasServerSidePagination(),
      serverSideSorting: this.hasServerSideSorting(),
      sorting: this.#sortingState(),
      sortingEnabled: this.#hasSortableColumns(),
      subRowsKey: this.subRows(),
      onClientPaginationChange: updater => {
        this.#clientPageIndex.set(this.#nextPageIndexFromUpdater(this.#clientPageIndex(), updater));
      },
      onExpandedChange: updater => {
        this.#applyExpanded(typeof updater === 'function' ? updater(this.#expanded()) : updater);
      },
      onServerPaginationChange: updater => {
        this.pageIndex.set(this.#nextPageIndexFromUpdater(this.pageIndex(), updater));
      },
      onSortingChange: updater => {
        this.#applySorting(nextSortingFromUpdater(this.#sortingState(), updater));
      },
    }),
  );

  /** Desktop table rows from row model; empty when no table. */
  protected readonly tableRows = computed<Row<TData>[]>(() => this.table()?.getRowModel().rows ?? []);

  /** True when desktop table has no rows (show empty row). */
  protected readonly isEmptyTable = computed(() => this.tableRows().length === 0);

  /** True when the card list has no cards (show empty state); parent rows never count as cards. */
  protected readonly isEmptyCardList = computed(() => this.cardRowsData().length === 0);

  /** Colspan for the empty-state cell in desktop table. */
  protected readonly emptyColSpan = computed(() => this.table()?.getHeaderGroups()[0]?.headers?.length ?? 1);

  /** Header views of the first header group, for skeleton row cells (desktop loading). */
  protected readonly skeletonDesktopHeaderViews = computed(() => this.headerGroupViews()[0]?.headers ?? []);

  /** Row indices for desktop skeleton (3 rows). */
  protected readonly skeletonDesktopRowIndices: readonly number[] = [0, 1, 2];

  /** Indices for the 3 skeleton list placeholders in card (mobile) view. */
  protected readonly skeletonCardIndices: readonly number[] = [0, 1, 2];

  /**
   * Whether to show pagination (has state and has rows); remains visible during loading.
   * Hidden for a nested card list paged client-side: that list renders every child in one scroll,
   * so the controls would report parent counts and page a list nobody can see changing.
   */
  protected readonly showPagination = computed(() => {
    const state = this.paginationState();
    if (!state || state.totalRows <= 0) {
      return false;
    }
    return !(this.isCardView() && this.#hasNestedRows() && !this.hasServerSidePagination());
  });

  /** Pagination state when visible; null when hidden. */
  protected readonly visiblePaginationState = computed(() => (this.showPagination() ? this.paginationState() : null));

  protected readonly searchVisible = computed(() => {
    const config = this.searchConfig();
    return Boolean(config && config.isVisible !== false);
  });

  protected readonly filterDisabled = computed(() => this.filterConfig()?.isDisabled ?? false);
  protected readonly filterIsActive = computed(() => this.filterConfig()?.isActive ?? false);
  protected readonly filterVisible = computed(() => {
    const config = this.filterConfig();
    return Boolean(config && config.isVisible !== false);
  });
  protected readonly filterSidePanelContent = computed(() => this.filterConfig()?.sidePanelContent ?? null);
  protected readonly filterSidePanelOptions = computed(() => this.filterConfig()?.sidePanelOptions ?? null);
  protected readonly selectedPills = computed(() => this.filterConfig()?.appliedFilters ?? []);
  protected readonly showActiveFilters = computed(() => this.selectedPills().length > 0);

  protected readonly toolbarActionsVisible = computed(() => this.visiblePaginationState() !== null || this.filterVisible());

  /** Toolbar: search, pagination, and/or filter. */
  protected readonly showToolbar = computed(() => this.searchVisible() || this.toolbarActionsVisible());

  /** Desktop tbody state: skeleton rows, empty message, or data rows. */
  protected readonly desktopBodyMode = computed<'skeleton' | 'empty' | 'data'>(() => {
    if (this.isLoading()) return 'skeleton';
    if (this.isEmptyTable()) return 'empty';
    return 'data';
  });

  constructor() {
    effect(() => {
      this.#sortingState.set(this.sorting());
    });
    effect(() => {
      this.data();
      this.#expandedState.set(true);
    });
    effect(() => {
      const subRowsKey = this.subRows();
      if (!isDevMode() || subRowsKey === undefined || !igntTableHasUnsupportedNesting({ data: this.data(), subRowsKey })) return;
      console.warn(
        `[ignt-table] "${subRowsKey}" nests more than one level deep. Only the first level renders as parent rows: deeper rows appear as siblings of their parent, with no toggle and no distinct index. Flatten the data to one level.`,
      );
    });
    effect(() => {
      if (!isDevMode() || !this.#keysByPosition()) return;
      console.warn(
        '[ignt-table] [expandedRowIds] is set without [getRowId], so expanded parents are keyed by their position in `data`: a reload that reorders or inserts parents expands the wrong ones. Give each parent a stable id with [getRowId].',
      );
    });
    effect(() => {
      if (!isDevMode() || !this.#hasNestedRows() || this.getRowCanExpand() === undefined || !this.isCardView()) return;
      console.warn(
        '[ignt-table] [getRowCanExpand] is set on a table rendering cards. The card layout has no parent rows to expand, so children loaded on expand never arrive and the list stays empty. Set layout="table" on a table that loads its children on demand.',
      );
    });
    effect(() => {
      if (!isDevMode()) return;
      const templatedSortable = this.columnComponents().filter(column => column.sortable() && column.headerTemplate() !== undefined);
      if (templatedSortable.length === 0) return;
      console.warn(
        `[ignt-table] ${templatedSortable
          .map(column => `"${column.header()}"`)
          .join(
            ', ',
          )} declare both [sortable] and igntTableHeaderTemplate. The sort button renders the header string, and the template is ignored: focusable content inside a button is invalid HTML, and a click on it would also toggle the sort. Drop one of the two.`,
      );
    });
    effect(() => {
      const current = this.pageSize();
      const prev = this.#prevPageSize();
      this.#prevPageSize.set(current);
      if (prev !== undefined && prev !== current) {
        if (this.hasPagination()) this.#clientPageIndex.set(0);
        if (this.hasServerSidePagination()) this.pageIndex.set(0);
      }
    });
    effect(() => {
      if (!this.hasServerSidePagination()) return;
      const idx = this.pageIndex();
      const last = this.#lastPageIndex();
      if (last === undefined) {
        this.#lastPageIndex.set(idx);
        return;
      }
      if (idx === last) return;
      this.#lastPageIndex.set(idx);
      this.expandedCardRowIds.set(new Set());
      this.paginationChange.emit({ pageIndex: idx });
    });
    effect(() => {
      if (!this.hasServerSideSorting()) return;
      const current = this.#sortingState();
      const last = this.#lastSorting();
      if (last === undefined) {
        this.#lastSorting.set(current);
        return;
      }
      if (isSortingEqual(current, last)) return;
      this.#lastSorting.set(current);
      this.sortingChange.emit({ sorting: current });
    });
  }

  protected ariaLabelForDataRow(rowIndex: number): string {
    return this.#translations().interactiveRowAriaLabel(rowIndex + 1);
  }

  /**
   * Handles pointer and keyboard activation for a row. Emits `rowInteraction` when `interactiveRows` is true.
   * Nested controls (buttons, links, etc.) should call `stopPropagation()` on `click` and `keydown` (Enter/Space) so the row does not also activate.
   */
  protected emitRowInteractionIfAllowed(event: MouseEvent | KeyboardEvent, row: Row<TData>): void {
    if (!this.interactiveRows()) return;
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
    }
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }
    this.rowInteraction.emit({ index: this.#flattenedRowIndex(row), item: row.original, originalEvent: event });
  }

  protected onPaginationPageChange(direction: 'previous' | 'next', table: Table<TData>): void {
    if (this.hasServerSidePagination()) {
      const nextIndex = this.pageIndex() + (direction === 'next' ? 1 : -1);
      this.pageIndex.set(nextIndex);
    } else if (direction === 'previous') table.previousPage();
    else table.nextPage();
  }

  protected toggleCardExpanded(rowId: string): void {
    const set = new Set(this.expandedCardRowIds());
    if (set.has(rowId)) set.delete(rowId);
    else set.add(rowId);
    this.expandedCardRowIds.set(set);
  }

  /**
   * Expands or collapses a parent row on pointer and keyboard (Enter/Space) activation.
   * Controls inside the parent row template should call `stopPropagation()` so they do not also toggle it.
   */
  protected toggleParentRowOnActivation(event: MouseEvent | KeyboardEvent, row: Row<TData>): void {
    if (!row.getCanExpand()) return;

    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
    }
    toggleIgntTableParentRow(row);
  }

  /** Stores the next expanded state where it lives: the host's `expandedRowIds` when it set one, the table otherwise. */
  #applyExpanded(next: ExpandedState): void {
    const current = this.expandedRowIds();
    if (current === undefined) {
      this.#expandedState.set(next);
      return;
    }
    this.expandedRowIds.set(igntTableExpandedIdsFromState({ current, state: next }));
  }

  /** Applies a new sorting state and sends the reader back to the first page, which the old sort ordered. */
  #applySorting(next: SortingState): void {
    if (isSortingEqual(next, this.#sortingState())) return;
    this.#sortingState.set(next);
    if (this.hasPagination() && !this.hasServerSidePagination()) this.#clientPageIndex.set(0);
    if (this.hasServerSidePagination()) this.pageIndex.set(0);
  }

  #buildHeaderView(header: Header<TData, unknown>): IgntTableHeaderView<TData> {
    return buildIgntTableHeaderView({
      header,
      widthStyleFromColumnSize: igntTableWidthStyleForColumnSize,
      sortColumnAriaLabel: params => this.#translations().sortColumnAriaLabel(params),
    });
  }

  #buildParentCellViews(
    row: Row<TData>,
    templates: Map<string, TemplateRef<IgntTableParentRowContext<TData>>>,
  ): IgntTableParentCellView<TData>[] {
    return buildIgntTableParentCellViews({
      labelColumnId: this.#parentLabelColumnId(),
      // The projected parent row component is not generic, so its template is declared against the base row type.
      labelTemplate: this.parentRowTemplate() as TemplateRef<IgntTableParentRowContext<TData>> | undefined,
      row,
      templates,
      widthStyleFromColumnSize: igntTableWidthStyleForColumnSize,
    });
  }

  #flattenedRowIndex(row: Row<TData>): number {
    return igntTableFlattenedRowIndex({ offsets: this.#parentSubRowOffsets(), row });
  }

  /**
   * Resolves TanStack's pagination updater (function or next state) to the next page index.
   * Used by both server-side (pageIndex model) and client-side (#clientPageIndex) handlers.
   */
  #nextPageIndexFromUpdater(currentPageIndex: number, updater: Updater<PaginationState>): number {
    const current: PaginationState = { pageIndex: currentPageIndex, pageSize: this.pageSize() };
    const next = typeof updater === 'function' ? updater(current) : updater;
    return next.pageIndex;
  }
}
