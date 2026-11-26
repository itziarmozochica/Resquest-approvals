import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { FilterDateRange } from '@fz-original/app/shared/layout/filters/date-range/date-range.interface';
import { FilterDateRangeModule } from '@fz-original/app/shared/layout/filters/date-range/date-range.module';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { PaginationRangeComponent } from '../../../fundraising/shared/components/pagination-range/pagination-range.component';
import { ValidationSummaryFilters } from '../../models/validation-summary-filters.model';

const EMPTY_FILTERS: ValidationSummaryFilters = {
  buyerName: null,
  eventDateRange: null,
  purchaseDateRange: null,
};
const BUYER_FILTER_DEBOUNCE_MS = 300;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FilterDateRangeModule,
    FormsModule,
    IgntButtonComponent,
    IgntInputFieldComponent,
    PaginationRangeComponent,
    SharedComponentsModule,
    TranslateModule,
  ],
  selector: 'app-validation-summary-filters',
  standalone: true,
  styleUrl: './validation-summary-filters.component.scss',
  templateUrl: './validation-summary-filters.component.html',
})
export class ValidationSummaryFiltersComponent {
  readonly #buyerNameSubject$ = new Subject<string | null>();
  readonly #destroyRef = inject(DestroyRef);
  #filters: ValidationSummaryFilters = { ...EMPTY_FILTERS };

  readonly buyerNameFilter = input<string | null>(null);
  readonly currentPage = input(1);
  readonly pageSize = input(10);
  readonly totalCount = input(0);

  readonly filtersChange = output<ValidationSummaryFilters>();
  readonly nextPage = output<void>();
  readonly previousPage = output<void>();

  protected readonly activeFiltersCount = signal(0);
  protected readonly buyerNameInput = signal('');
  protected readonly showFilters = signal(false);
  protected sliderFilters: ValidationSummaryFilters = { ...EMPTY_FILTERS };

  constructor() {
    this.#buyerNameSubject$.pipe(debounceTime(BUYER_FILTER_DEBOUNCE_MS), takeUntilDestroyed(this.#destroyRef)).subscribe(buyerName => {
      const inputTrimmed = this.buyerNameInput().trim();
      const normalizedFromInput = inputTrimmed.length > 0 ? inputTrimmed : null;
      if (buyerName !== normalizedFromInput) {
        return;
      }
      this.#filters = { ...this.#filters, buyerName };
      this.sliderFilters = { ...this.sliderFilters, buyerName };
      this.#updateActiveFiltersCount();
      this.filtersChange.emit(this.#filters);
    });

    effect(() => {
      const fromParent = this.buyerNameFilter();
      const display = fromParent ?? '';
      untracked(() => {
        if (display !== this.buyerNameInput()) {
          this.buyerNameInput.set(display);
        }
        const trimmed = this.buyerNameInput().trim();
        const buyerName = trimmed.length > 0 ? trimmed : null;
        if (buyerName !== this.#filters.buyerName) {
          this.#filters = { ...this.#filters, buyerName };
          this.sliderFilters = { ...this.sliderFilters, buyerName };
          this.#updateActiveFiltersCount();
        }
      });
    });
  }

  protected applyFilters(): void {
    this.#filters = { ...this.sliderFilters };
    this.#updateActiveFiltersCount();
    this.filtersChange.emit(this.#filters);
    this.showFilters.set(false);
  }

  protected changeBuyerName(value: string): void {
    this.buyerNameInput.set(value ?? '');
    const trimmed = (value ?? '').trim();
    this.#buyerNameSubject$.next(trimmed.length > 0 ? trimmed : null);
  }

  protected clearFilters(): void {
    this.sliderFilters = {
      ...this.sliderFilters,
      eventDateRange: null,
      purchaseDateRange: null,
    };
    this.applyFilters();
  }

  protected closeFilters(): void {
    this.sliderFilters = { ...this.#filters };
    this.showFilters.set(false);
  }

  protected onNextPage(): void {
    this.nextPage.emit();
  }

  protected onPreviousPage(): void {
    this.previousPage.emit();
  }

  protected openFilterModal(): void {
    this.sliderFilters = { ...this.#filters };
    this.showFilters.set(true);
  }

  protected selectEventDateRange(range: FilterDateRange | null): void {
    this.sliderFilters = { ...this.sliderFilters, eventDateRange: range };
  }

  protected selectPurchaseDateRange(range: FilterDateRange | null): void {
    this.sliderFilters = { ...this.sliderFilters, purchaseDateRange: range };
  }

  #updateActiveFiltersCount(): void {
    let count = 0;
    if (this.#filters.purchaseDateRange !== null) {
      count++;
    }
    if (this.#filters.eventDateRange !== null) {
      count++;
    }
    if ((this.#filters.buyerName?.trim().length ?? 0) > 0) {
      count++;
    }
    this.activeFiltersCount.set(count);
  }
}
