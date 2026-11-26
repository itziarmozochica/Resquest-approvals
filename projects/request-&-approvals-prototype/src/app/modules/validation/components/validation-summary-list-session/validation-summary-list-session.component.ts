import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ValidationOrderSummary } from '@fz-original/app/shared/models/order/order-summary.model';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { ValidationSummaryFilters } from '../../models/validation-summary-filters.model';
import { ValidationEmptyFiltersPlaceholderComponent } from '../validation-empty-filters-placeholder/validation-empty-filters-placeholder.component';
import { ValidationLoadingSpinnerComponent } from '../validation-loading-spinner/validation-loading-spinner.component';
import { ValidationSummaryFiltersComponent } from '../validation-summary-filters/validation-summary-filters.component';
import { ValidationSummaryTableComponent } from '../validation-summary-table/validation-summary-table.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntIconComponent,
    TranslateModule,
    ValidationEmptyFiltersPlaceholderComponent,
    ValidationLoadingSpinnerComponent,
    ValidationSummaryFiltersComponent,
    ValidationSummaryTableComponent,
  ],
  selector: 'app-validation-summary-list-session',
  standalone: true,
  styleUrl: './validation-summary-list-session.component.scss',
  templateUrl: './validation-summary-list-session.component.html',
})
export class ValidationSummaryListSessionComponent {
  readonly filteredOrderSummaries = input.required<ValidationOrderSummary[]>();
  readonly summaryFilters = input.required<ValidationSummaryFilters>();
  readonly loadingSearch = input(false);
  readonly summaryCurrentPage = input(1);
  readonly summaryListSessionActive = input(false);
  readonly summaryPageSize = input(10);
  readonly summaryTotalCount = input(0);

  readonly filtersChange = output<ValidationSummaryFilters>();
  readonly nextPage = output<void>();
  readonly openHowToValidate = output<void>();
  readonly previousPage = output<void>();
  readonly rowSelect = output<ValidationOrderSummary>();

  protected onFiltersChange(filters: ValidationSummaryFilters): void {
    this.filtersChange.emit(filters);
  }

  protected onNextPage(): void {
    this.nextPage.emit();
  }

  protected onOpenHowToValidate(): void {
    this.openHowToValidate.emit();
  }

  protected onPreviousPage(): void {
    this.previousPage.emit();
  }

  protected onRowSelect(summary: ValidationOrderSummary): void {
    this.rowSelect.emit(summary);
  }
}
