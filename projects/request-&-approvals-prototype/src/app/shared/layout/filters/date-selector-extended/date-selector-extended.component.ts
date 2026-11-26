import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { Subject } from 'rxjs';

import { FilterDateRange } from '../date-range/date-range.interface';
import { DateSelectorExtendedItem, DateSelectorExtendedState } from './date-selector-extended-models';

/**
 * As per today (20250414) this component is only used in
 * GenerateSimplifiedBillsStatementModalComponent
 * and its template is not inputting `intialState`.
 *
 * This means `intialState` is always null because
 * it does not get re-assigned here.
 */
@Component({
  selector: 'app-date-selector-extended',
  standalone: false,
  templateUrl: './date-selector-extended.component.html',
  styleUrls: ['./date-selector-extended.component.scss'],
})
export class DateSelectorExtendedComponent implements OnInit {
  static readonly DATERANGE_TYPE = 'range';

  @Input() selectors: DateSelectorExtendedItem[];
  @Input() intialState: DateSelectorExtendedState | null = null;

  @Output() state = new EventEmitter<DateSelectorExtendedState>();

  dateButtonSelected = '';
  resetDate: Subject<void> = new Subject();

  ngOnInit(): void {
    this.dateButtonSelected = (this.intialState !== null && this.intialState.name) || DateSelectorExtendedComponent.DATERANGE_TYPE;
  }

  onSelector(selector: DateSelectorExtendedItem): void {
    this.resetDate.next();
    this.dateButtonSelected = selector.type;
    this.state.emit({
      date: selector.cb(),
      name: this.dateButtonSelected,
    });
  }

  getDateRange(dateRange: FilterDateRange): void {
    this.dateButtonSelected = DateSelectorExtendedComponent.DATERANGE_TYPE;
    this.state.emit({
      date: dateRange,
      name: DateSelectorExtendedComponent.DATERANGE_TYPE,
    });
  }

  /**
   * @returns always null as per today (20250414)
   */
  parseInitialDateRange(): FilterDateRange | null {
    return this.intialState !== null &&
      this.intialState.date !== null &&
      this.dateButtonSelected === DateSelectorExtendedComponent.DATERANGE_TYPE
      ? this.intialState.date
      : null;
  }
}
