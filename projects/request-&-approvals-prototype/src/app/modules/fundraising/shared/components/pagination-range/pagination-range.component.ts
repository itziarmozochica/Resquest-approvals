import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconButtonComponent, TranslateModule],
  selector: 'app-pagination-range',
  standalone: true,
  styleUrls: ['./pagination-range.component.scss'],
  templateUrl: './pagination-range.component.html',
})
export class PaginationRangeComponent {
  currentPage = input.required<number>();
  pageSize = input.required<number>();
  totalCount = input.required<number>();

  nextPage = output<void>();
  previousPage = output<void>();

  endItem = computed<number>(() => {
    const total = this.totalCount();
    const end = this.currentPage() * this.pageSize();
    return Math.min(end, total);
  });

  startItem = computed<number>(() => {
    const page = this.currentPage();
    const size = this.pageSize();
    const total = this.totalCount();
    return Math.min((page - 1) * size + 1, total);
  });

  isPreviousDisabled = computed<boolean>(() => this.currentPage() <= 1);

  isNextDisabled = computed<boolean>(() => this.currentPage() * this.pageSize() >= this.totalCount());

  shouldShow = computed<boolean>(() => this.totalCount() > 0);

  onNextClick(): void {
    if (!this.isNextDisabled()) {
      this.nextPage.emit();
    }
  }

  onPreviousClick(): void {
    if (!this.isPreviousDisabled()) {
      this.previousPage.emit();
    }
  }
}
