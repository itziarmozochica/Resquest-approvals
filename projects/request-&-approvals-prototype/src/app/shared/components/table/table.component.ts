import { Component, EventEmitter, Input, Output, Pipe, PipeTransform } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';

import { SelectOption } from '../../layout/filters/select/select.interface';
import { TableHeader } from './model/table-header';
import { TableOrderBy } from './model/table-order-by';

export enum TableType {
  TABLE = 'table',
  FZ_TABLE = 'fz-table',
}

@Component({
  selector: 'app-table',
  standalone: false,
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
})
export class TableComponent {
  @Input() hasActions = true;
  @Input() headers: TableHeader[] = [];
  @Input() orderBy: TableOrderBy | null = null;
  @Input() paddingHeader: string | null = null;
  @Input() scrollable = false;
  @Input() type: TableType = TableType.TABLE;
  @Output() updateFilterByEmit = new EventEmitter<{ field: string; option: SelectOption }>();
  @Output() updateOrderByEmit = new EventEmitter<string | string[]>();

  filterBy(field: string, option: SelectOption): void {
    const headerList = this.headers.filter(header => header['filterBy'] === field);
    if (headerList.length === 0 || headerList[0]?.['filterByOptions']?.length === 0) {
      return;
    }
    headerList[0]['filterBySelected'] = option;
    this.updateFilterByEmit.emit({ field, option });
  }

  updateOrderBy(field: string | string[]): void {
    this.updateOrderByEmit.emit(field);
  }
}

/**
 * @todo move these pipes to their own files
 * and make them standalone
 */
@Pipe({
  name: 'tableOrderByIcon',
  standalone: false,
})
export class TableOrderByIconPipe implements PipeTransform {
  transform(field: string, orderBy: TableOrderBy): IconProp {
    if (orderBy?.field === field) {
      if (orderBy.direction === 'asc') {
        return ['far', 'sort-amount-up-alt'];
      }
      return ['far', 'sort-amount-down-alt'];
    }

    return ['far', 'sort-alt'];
  }
}

@Pipe({
  name: 'tableOrderBySelected',
  standalone: false,
})
export class TableOrderBySelectedPipe implements PipeTransform {
  transform(field: string, orderBy: TableOrderBy): boolean {
    return orderBy?.field === field;
  }
}
