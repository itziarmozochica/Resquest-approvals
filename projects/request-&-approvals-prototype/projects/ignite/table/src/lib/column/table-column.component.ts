import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  ElementRef,
  inject,
  input,
  TemplateRef,
} from '@angular/core';

import type { ColumnDef, SortingFnOption } from '@tanstack/table-core';

import type { IgntTableCellContext, IgntTableColumnAlign, IgntTableColumnType, IgntTableRowData } from '../models';
import { IgntTableColumnTemplateDirective } from './table-column-template.directive';
import { IgntTableHeaderTemplateDirective } from './table-header-template.directive';

/** Counter for internal column ids when key is omitted (e.g. action columns). */
let internalColumnIdCounter = 0;

/**
 * Column definition for ignt-table (layer 2 – configuration).
 * Purely declarative: metadata and reference to the cell template.
 * Use key for data columns; omit key for non-data columns (e.g. action column) and set columnType if needed.
 * For typed cell templates use [igntTableColumnTemplateType] on igntTableColumnTemplateType.
 * For a header carrying markup use igntTableHeaderTemplate; header stays required either way.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'ignt-table-column',
  standalone: true,
  template: '<ng-content />',
})
export class IgntTableColumnComponent {
  /** Stable internal id for this column when key is omitted. */
  readonly #internalColumnId = (() => {
    internalColumnIdCounter += 1;
    return `__col_${internalColumnIdCounter}`;
  })();

  /** Header text. Also the card-view field label, the sort button's accessible name, and the fallback with no header template. */
  readonly header = input.required<string>();
  readonly align = input<IgntTableColumnAlign>();
  /** Column type: primary (card title), secondary (visible before "see more"), action. Unset = after "see more". */
  readonly columnType = input<IgntTableColumnType>();
  /** Column key (accessor). Omit for non-data columns (e.g. actions); an internal id is used. */
  readonly key = input<string>();

  /** Enables sorting for this column. Requires `key`; disabled for action columns. Default: false. */
  readonly sortable = input(false, { transform: booleanAttribute });

  /** Optional TanStack sorting function (`'auto'`, `'alphanumeric'`, or a custom fn). */
  readonly sortingFn = input<SortingFnOption<IgntTableRowData>>();

  /** Column width in pixels (number is rounded). */
  readonly width = input<number>();

  /** Custom header template; no context. Mark the ng-template with igntTableHeaderTemplate. */
  readonly headerTemplate = contentChild(IgntTableHeaderTemplateDirective, { read: TemplateRef });

  protected readonly markedCellTemplate = contentChild<
    IgntTableColumnTemplateDirective,
    TemplateRef<IgntTableCellContext<IgntTableRowData>>
  >(IgntTableColumnTemplateDirective, { read: TemplateRef });
  protected readonly projectedTemplates = contentChildren<TemplateRef<IgntTableCellContext<IgntTableRowData>>>(TemplateRef);

  readonly #hostElement = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Custom cell template; context: item, value, index. Use [igntTableColumnTemplateType] on the ng-template for typed context.
   * The marker wins; the bare-template fallback only considers templates declared directly on this element, because the
   * query also reports the implicit anchors `@if` / `@for` create inside another projected template.
   */
  readonly cellTemplate = computed<TemplateRef<IgntTableCellContext<IgntTableRowData>> | undefined>(() => {
    const marked = this.markedCellTemplate();
    if (marked) {
      return marked;
    }

    const headerAnchor: unknown = this.headerTemplate()?.elementRef.nativeElement;
    return this.projectedTemplates().find(template => {
      const anchor = template.elementRef.nativeElement as Node | null;
      return anchor !== (headerAnchor as Node | null) && anchor?.parentNode === this.#hostElement.nativeElement;
    });
  });

  /** Column definition derived from inputs; recomputes only when inputs or cellTemplate change. */
  readonly columnDef = computed<ColumnDef<IgntTableRowData>>(() => {
    const key = this.key();
    const columnId = key !== undefined && key !== '' ? key : this.#internalColumnId;
    const header = this.header();
    const width = this.width();
    const alignInput = this.align();
    const cellTemplateRef = this.cellTemplate();
    const headerTemplateRef = this.headerTemplate();
    const columnTypeResolved = this.columnType() ?? (columnId === 'action' ? 'action' : undefined);
    const alignResolved = alignInput ?? (columnTypeResolved === 'action' ? 'right' : undefined);
    const size = width !== undefined && Number.isFinite(width) && width >= 0 ? Math.round(width) : undefined;
    const hasDataKey = key !== undefined && key !== '';
    const isActionColumn = columnTypeResolved === 'action';
    const sortable = this.sortable() && hasDataKey && !isActionColumn;
    const sortingFn = this.sortingFn();

    return {
      id: columnId,
      ...(hasDataKey && { accessorKey: key }),
      enableSorting: sortable,
      header,
      meta: {
        align: alignResolved,
        cellTemplateRef: cellTemplateRef ?? undefined,
        columnType: columnTypeResolved,
        headerTemplateRef: headerTemplateRef ?? undefined,
      },
      size,
      ...(sortable && sortingFn !== undefined && { sortingFn }),
    };
  });
}
