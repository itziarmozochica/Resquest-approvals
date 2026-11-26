import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { IconsModule } from '../../icons/icons.module';

export interface TableColumn<T> {
  class?: string;
  header: string;
  key: keyof T;
  render?: (item: T) => string;
}

export interface TableAction<T> {
  class?: string;
  disabled?: (item: T) => boolean;
  handler: (item: T) => void;
  icon: [string, string];
  title: string;
  visible?: (item: T) => boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IconsModule, TranslateModule],
  selector: 'app-generic-table',
  standalone: true,
  styleUrls: ['./generic-table.component.scss'],
  templateUrl: './generic-table.component.html',
})
export class GenericTableComponent<T> {
  @Input() actions: TableAction<T>[] = [];
  @Input({ required: true }) columns!: TableColumn<T>[];
  @Input({ required: true }) data!: T[];
  @Input() emptyMessage = 'common.noData';
  @Input() isLoading = false;
  @Input() tableClass = '';

  getCellValue(item: T, column: TableColumn<T>): string {
    if (column.render) {
      return column.render(item);
    }
    return String(item[column.key] ?? '');
  }

  isActionDisabled(item: T, action: TableAction<T>): boolean {
    return action.disabled ? action.disabled(item) : false;
  }

  isActionVisible(item: T, action: TableAction<T>): boolean {
    return action.visible ? action.visible(item) : true;
  }

  onActionClick(item: T, action: TableAction<T>): void {
    if (!this.isActionDisabled(item, action)) {
      action.handler(item);
    }
  }
}
