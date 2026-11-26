import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';

import { IgntTableTranslationsDirective } from '../table-translations.directive';

/**
 * Pagination controls for the table: "X - Y of Z" and previous/next arrows.
 * Used by ignt-table; can be reused standalone.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [IgntTableTranslationsDirective],
  imports: [IgntIconButtonComponent],
  selector: 'ignt-table-pagination',
  standalone: true,
  styleUrl: './table-pagination.component.scss',
  templateUrl: './table-pagination.component.html',
})
export class IgntTablePaginationComponent {
  readonly #translations = inject(IgntTableTranslationsDirective).translations;

  readonly pageIndex = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly totalRowCount = input.required<number>();
  /** When true, previous/next arrows are disabled (e.g. during loading). */
  readonly disabled = input<boolean>(false);

  protected readonly canNextPage = computed(() => (this.pageIndex() + 1) * this.pageSize() < this.totalRowCount());
  protected readonly canPreviousPage = computed(() => this.pageIndex() > 0);

  /** End index (1-based) for "X - Y of Z". */
  protected readonly paginationEnd = computed(() => Math.min((this.pageIndex() + 1) * this.pageSize(), this.totalRowCount()));

  /** Start index (1-based) for "X - Y of Z". Clamped so start ≤ end when page overshoots (e.g. server-side total shrinks). */
  protected readonly paginationStart = computed(() => {
    const end = this.paginationEnd();
    const rawStart = this.pageIndex() * this.pageSize() + 1;
    return Math.min(rawStart, end);
  });

  /** Pagination range label from translations callback. */
  protected readonly paginationRangeLabel = computed<string>(() =>
    this.#translations().paginationOf({
      from: this.paginationStart(),
      to: this.paginationEnd(),
      total: this.totalRowCount(),
    }),
  );

  /** Emitted when user clicks previous or next. Payload is the requested direction. */
  readonly pageChange = output<'previous' | 'next'>();

  protected onNext(): void {
    this.pageChange.emit('next');
  }

  protected onPrevious(): void {
    this.pageChange.emit('previous');
  }
}
