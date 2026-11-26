import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-pagination-with-numbers',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, IgntButtonComponent, TranslateModule],
  templateUrl: './pagination-with-numbers.component.html',
  styleUrls: ['./pagination-with-numbers.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationWithNumbersComponent implements OnChanges {
  private MAX_PAGES_TO_SHOW = 3;
  private BOUNDARY_COUNT = 1;
  ELLIPSIS = '...';
  @Input() selectedPage = 1;
  @Input() totalCountResults = 0;
  @Input() pageSize = 0;
  @Input() previousPage: number | null = null;
  @Input() nextPage: number | null = null;

  numPages = 0;
  pagesToShow: string[] = [];
  selectedPageStr = '';

  @Output() numPageSelected = new EventEmitter<number>();

  onNumPageSelected(page: string | number): void {
    if (this.selectedPage !== Number(page)) {
      this.numPageSelected.emit(Number(page));
    }
  }

  ngOnChanges(): void {
    this.selectedPageStr = this.selectedPage.toString();
    this.numPages = this.pageSize && this.totalCountResults ? Math.ceil(this.totalCountResults / this.pageSize) : 0;
    this.pagesToShow = this.numPages && this.selectedPage ? this.calculatePagesToShow(this.numPages, this.selectedPage || 1) : [];
  }

  private calculatePagesToShow(totalPages: number, currentPage: number): string[] {
    if (this.numPages === 1) return ['1'];

    if (this.notEnoughPagesToDivide(totalPages)) {
      return Array.from({ length: totalPages }, (_, i) => (i + 1).toString());
    }

    const startPages: string[] = this.calculateStartPages();

    const startPage = Math.max(this.BOUNDARY_COUNT + 1, currentPage - Math.floor(this.MAX_PAGES_TO_SHOW / 2));
    const endPage = Math.min(totalPages - this.BOUNDARY_COUNT, startPage + this.MAX_PAGES_TO_SHOW - 1);

    const middlePages: string[] = this.calculateMiddlePages(totalPages, startPage, endPage);
    const endPages: string[] = this.calculateEndPages(totalPages);

    const separationBetweenStartAndMiddle = this.needsSeparationBetweenStartAndMiddle(currentPage) ? [this.ELLIPSIS] : [];
    const separationBetweenMiddleAndEnd = this.needsSeparationBetweenMiddleAndEnd(endPage, totalPages) ? [this.ELLIPSIS] : [];

    return [...startPages, ...separationBetweenStartAndMiddle, ...middlePages, ...separationBetweenMiddleAndEnd, ...endPages];
  }

  private notEnoughPagesToDivide = (totalPages: number): boolean => totalPages <= this.MAX_PAGES_TO_SHOW + 2 * this.BOUNDARY_COUNT;
  private needsSeparationBetweenStartAndMiddle = (currentPage: number): boolean =>
    currentPage > this.BOUNDARY_COUNT + Math.ceil(this.MAX_PAGES_TO_SHOW / 2);
  private needsSeparationBetweenMiddleAndEnd = (endPage: number, totalPages: number): boolean => endPage < totalPages - this.BOUNDARY_COUNT;

  private calculateStartPages(): string[] {
    return Array.from({ length: this.BOUNDARY_COUNT }, (_, i) => (i + 1).toString());
  }

  private calculateEndPages(totalPages: number): string[] {
    return Array.from({ length: this.BOUNDARY_COUNT }, (_, i) => (totalPages - this.BOUNDARY_COUNT + 1 + i).toString());
  }

  private calculateMiddlePages(totalPages: number, startPage: number, endPage: number): string[] {
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => (startPage + i).toString());
  }
}
