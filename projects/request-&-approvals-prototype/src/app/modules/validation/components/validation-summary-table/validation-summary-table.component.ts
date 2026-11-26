import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';

import { ValidationOrderSummary } from '@fz-original/app/shared/models/order/order-summary.model';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { getOrderStatusLabelKey, getOrderStatusSentiment, getOrderStatusVariant } from '@fz-original/app/shared/utils/order-status.util';
import { IgntTagComponent, TagSentiment, TagVariant } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import {
  IgntTableColumnComponent,
  IgntTableColumnTemplateDirective,
  IgntTableComponent,
  IgntTablePageChangeEvent,
  IgntTableRowInteractionEvent,
} from '@ignite/table';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PipesModule, IgntTableColumnComponent, IgntTableColumnTemplateDirective, IgntTableComponent, IgntTagComponent, TranslateModule],
  selector: 'app-validation-summary-table',
  standalone: true,
  styleUrl: './validation-summary-table.component.scss',
  templateUrl: './validation-summary-table.component.html',
})
export class ValidationSummaryTableComponent {
  readonly #userService = inject(UserService);
  readonly #isSuperuser = this.#userService.getUser()?.isStaff() ?? false;

  readonly data = input.required<ValidationOrderSummary[]>();
  readonly isLoading = input(false);
  readonly pageIndex = input(0);
  readonly pageSize = input(10);
  readonly pageCount = input(0);
  readonly totalRowCount = input<number | undefined>(undefined);

  readonly paginationChange = output<IgntTablePageChangeEvent>();
  readonly rowSelect = output<ValidationOrderSummary>();

  protected readonly hasServerSidePagination = computed<boolean>(() => this.pageCount() > 0);
  protected readonly rowSample = computed<ValidationOrderSummary | undefined>(() => this.data()[0]);

  protected getStatusLabelKey(status: string): string {
    return getOrderStatusLabelKey(status, this.#isSuperuser);
  }

  protected getStatusSentiment(status: string | null | undefined): TagSentiment {
    return getOrderStatusSentiment(status, this.#isSuperuser);
  }

  protected getStatusVariant(status: string | null | undefined): TagVariant {
    return getOrderStatusVariant(status);
  }

  protected onPaginationChange(event: IgntTablePageChangeEvent): void {
    this.paginationChange.emit(event);
  }

  protected onRowInteraction(event: IgntTableRowInteractionEvent<ValidationOrderSummary>): void {
    this.rowSelect.emit(event.item);
  }
}
