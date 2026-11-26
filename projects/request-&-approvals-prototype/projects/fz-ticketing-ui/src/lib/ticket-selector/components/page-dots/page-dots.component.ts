import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { ResolvedFztTicketSelectorTranslations } from '../../models/ticket-selector-translations.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'fzt-page-dots',
  standalone: true,
  styleUrl: './page-dots.component.scss',
  templateUrl: './page-dots.component.html',
})
export class FztPageDotsComponent {
  readonly translations = input.required<ResolvedFztTicketSelectorTranslations>();
  readonly pageCount = input(0);
  readonly selectedIndex = input(0);
  readonly pageSelected = output<number>();

  protected readonly pages = computed<readonly number[]>(() => {
    const pages: number[] = [];

    for (let index = 0; index < this.pageCount(); index += 1) {
      pages.push(index);
    }

    return pages;
  });

  protected ariaLabelFor(pageIndex: number): string {
    return this.translations().pageDotAriaLabel.replace('{page}', `${pageIndex + 1}`);
  }

  protected onDotClick(pageIndex: number): void {
    this.pageSelected.emit(pageIndex);
  }
}
