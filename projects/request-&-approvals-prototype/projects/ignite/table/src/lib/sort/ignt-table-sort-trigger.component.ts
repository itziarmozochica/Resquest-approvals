import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IgntIconComponent } from '@ignite/icon';

import type { IgntTableColumnAlign, IgntTableSortIconName } from '../models';

export interface IgntTableSortContext {
  align: IgntTableColumnAlign | undefined;
  columnId: string;
  isSortActive: boolean;
  label: string;
  sortAriaLabel: string | null;
  sortIcon: IgntTableSortIconName;
  toggleSorting: ((event: unknown) => void) | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent],
  selector: 'ignt-table-sort-trigger',
  standalone: true,
  styleUrl: './ignt-table-sort-trigger.component.scss',
  templateUrl: './ignt-table-sort-trigger.component.html',
})
export class IgntTableSortTriggerComponent {
  readonly headerView = input.required<IgntTableSortContext>();
  readonly isLoading = input(false, { transform: booleanAttribute });

  protected onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.headerView().toggleSorting?.(event);
  }
}
