import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  input,
  Input,
  OnChanges,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { isString } from '@fz-original/app/app/utils/ts/ts.util';
import { NgbCalendar, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';

import { FilterDateRange } from './date-range.interface';

@Component({
  host: { '[class.date-range--inline]': 'alwaysOpen' },
  selector: 'app-date-range',
  standalone: false,
  templateUrl: './date-range.component.html',
  styleUrls: ['./date-range.component.scss'],
})
export class FilterDateRangeComponent implements OnInit, OnChanges {
  readonly #router = inject(Router);
  @ViewChild('input', { static: true }) inputElement!: ElementRef<HTMLElement>;
  @ViewChild('datepicker', { read: ElementRef }) datepickerElement: ElementRef<HTMLElement> | undefined;

  @Output() selected = new EventEmitter<FilterDateRange | null>();
  // Fires the in-progress, start-only pick that `selected` deliberately omits (the range is not yet
  // complete, so its endDate is null). Consumers mirroring a draft selection — e.g. the audit-report
  // date-time range — bind this to catch that intermediate state; `selected` remains the source of
  // truth for a completed range or a clear. Emitted only for partial picks, never on completion.
  @Output() partialSelectionChange = new EventEmitter<FilterDateRange | null>();
  @Input() queryDateRange: FilterDateRange | null = null;
  @Input() initialDateShown = true;
  @Input() resetDate: Subject<void> | undefined;
  @Input() allowClearDate = false;
  @Input() maxDateRange: number | undefined;
  @Input() disabled = false;
  // Opt-in: keep the calendar rendered inline instead of as a click-to-open popover. Default off so
  // every other consumer keeps the popover behaviour.
  @Input() alwaysOpen = false;
  // Number of months the calendar renders. Default 2 preserves the previous hardcoded value.
  @Input() displayMonths = 2;
  // Opt-out for the footer's today/current-week shortcut buttons. Default on so every other consumer
  // keeps the full footer.
  @Input() showFooterShortcuts = true;
  readonly maxDate = input<Date | null>(null);

  protected readonly maxNgbDate = computed(() => {
    const maxDate = this.maxDate();

    return maxDate === null ? null : new NgbDate(maxDate.getUTCFullYear(), maxDate.getUTCMonth() + 1, maxDate.getUTCDate());
  });

  showNewCalendarOnReservations = false;

  hoveredDate: NgbDate | null = null;
  fromDate: NgbDate | null = null;
  toDate: NgbDate | null = null;

  dateRange: FilterDateRange | null = null;

  isOpen = false;
  isMobile = false;

  constructor(
    private renderer: Renderer2,
    private calendar: NgbCalendar,
    private deviceDetectorService: DeviceDetectorService,
  ) {
    this.isMobile = this.deviceDetectorService.isMobile();
  }

  ngOnInit(): void {
    this.initFeatureFlags();
    if (this.queryDateRange !== null && this.queryDateRange.startDate !== null && this.queryDateRange.endDate !== null) {
      /**
       * @caution
       *
       * Maybe either `startDate` or `endDate` are undefined despite of the typing.
       */
      this.setDateRange(this.queryDateRange.startDate, this.queryDateRange.endDate);
    } else if (this.initialDateShown) {
      const { from, to } = this.getCurrentWeek();
      this.setDateRange(from, to);
      if (this.dateRange !== null) {
        this.selected.emit(this.dateRange);
      }
    }
    if (this.resetDate) {
      this.resetDate.subscribe(() => {
        if (this.allowClearDate) {
          this.setDateRange(null, null);
        } else {
          const { from, to } = this.getCurrentWeek();
          this.setDateRange(from, to);
        }
      });
    }
  }

  private initFeatureFlags() {
    const allowedPaths = this.#router.url.includes('reservations/list') || this.#router.url.includes('reservations/user-list');
    this.showNewCalendarOnReservations = allowedPaths;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.queryDateRange == null) {
      return;
    }
    if (changes.queryDateRange.currentValue == null) {
      this.setDateRange(null, null);
      return;
    }
    if (this.queryDateRange != null && this.queryDateRange.startDate !== undefined && this.queryDateRange.endDate !== undefined) {
      this.setDateRange(this.queryDateRange.startDate, this.queryDateRange.endDate);
    }
  }

  private convertToNgbDate(date: Date | NgbDate): NgbDate | null {
    if (date instanceof NgbDate) {
      return date;
    }
    return new NgbDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }

  private convertToDate(date: NgbDate | Date): Date {
    if (date instanceof Date) {
      return date;
    }
    return new Date(Date.UTC(date.year, date.month - 1, date.day));
  }

  private getCurrentWeek(): { from: NgbDate; to: NgbDate } {
    return {
      from: this.calendar.getToday(),
      to: this.calendar.getNext(this.calendar.getToday(), 'd', 6),
    };
  }

  private setDateRange(from: NgbDate | Date | null, to: NgbDate | Date | null) {
    if (from === undefined) {
      throw new Error('From date is undefined');
    }
    if (to === undefined) {
      throw new Error('To date is undefined');
    }
    this.fromDate = from !== null ? this.convertToNgbDate(from) : null;
    this.toDate = to !== null ? this.convertToNgbDate(to) : null;
    this.dateRange = this.fromDate === null && this.toDate === null ? null : this.toDateRange(from, to);
  }

  @HostListener('window:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.isMobile) {
      return;
    }
    let close = true;

    if (event.target !== null) {
      if (
        (this.datepickerElement && this.isParent(event.target, this.datepickerElement.nativeElement)) ||
        (this.inputElement && this.isParent(event.target, this.inputElement.nativeElement))
      ) {
        close = false;
      }
    }

    if (close) {
      this.close();
    }
  }

  onNativeFromDateSelection(date: string): void {
    if (!this.allowClearDate && !date) {
      return;
    }
    if (!date) {
      this.setDateRange(null, null);
      this.selected.emit(null);
    } else {
      const fromDate = this.convertToNgbDate(new Date(date));
      this.setDateRange(fromDate, this.toDate && this.toDate.after(fromDate) ? this.toDate : fromDate);
      if (this.dateRange !== null) {
        this.selected.emit(this.dateRange);
      }
    }
  }

  // Not sure about if it can be null or undefined when it is not a string.
  onNativeToDateSelection(date: string | null | undefined): void {
    if (!this.allowClearDate && (date == null || (isString(date) && date.length === 0))) {
      return;
    }
    if (this.dateRange !== null && this.dateRange.startDate !== null) {
      if (date != null && date.length > 0) {
        /**
         * @caution
         *
         * Maybe either `startDate` or `endDate` are undefined despite of the typing.
         */
        this.setDateRange(this.dateRange.startDate, new Date(date));
      } else {
        /**
         * @caution
         *
         * Maybe either `startDate` or `endDate` are undefined despite of the typing.
         */
        this.setDateRange(this.dateRange.startDate, null);
      }
      this.selected.emit(this.dateRange);
    }
  }

  onDateSelection(date: NgbDate): void {
    if (!this.fromDate && !this.toDate) {
      this.fromDate = date;
      this.partialSelectionChange.emit(this.toDateRange(date, null));
    } else if (this.fromDate && !this.toDate && (date.after(this.fromDate) || date.equals(this.fromDate))) {
      if (!this.maxDateRange) {
        this.setDateRange(this.fromDate, date);
        this.selected.emit(this.dateRange);
        this.isOpen = false;
      } else {
        const diffInDays = this.calculateDateDifference(this.fromDate, date);
        if (diffInDays <= this.maxDateRange) {
          this.setDateRange(this.fromDate, date);
          this.selected.emit(this.dateRange);
          this.isOpen = false;
        }
      }
    } else {
      this.setDateRange(date, null);
      this.partialSelectionChange.emit(this.dateRange);
    }
  }

  calculateDateDifference(from: NgbDate, to: NgbDate): number {
    const fromDate = new Date(from.year, from.month - 1, from.day);
    const toDate = new Date(to.year, to.month - 1, to.day + 1);
    const diffInMilliseconds = toDate.getTime() - fromDate.getTime();
    return Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
  }

  isHovered(date: NgbDate): boolean {
    return !!(
      this.fromDate !== null &&
      this.toDate === null &&
      this.hoveredDate != null &&
      date.after(this.fromDate) &&
      date.before(this.hoveredDate)
    );
  }

  isInside(date: NgbDate): boolean {
    return date.after(this.fromDate) && date.before(this.toDate);
  }

  isRange(date: NgbDate): boolean {
    return date.equals(this.fromDate) || date.equals(this.toDate) || this.isInside(date) || this.isHovered(date);
  }

  openForDesktopDevices(): void {
    // Open the date range picker only for desktop devices
    // for mobile devices the date range picker is managed with onNativeFromDateSelection and onNativeToDateSelection
    if (!this.isMobile) {
      this.open();
    }
  }

  open(): void {
    if (!this.disabled) {
      this.isOpen = true;
    }
  }

  close(): void {
    this.isOpen = false;
  }

  clear(): void {
    if (!this.allowClearDate) {
      return;
    }
    this.setDateRange(null, null);
    this.selected.emit(this.dateRange);
    this.close();
  }
  today(): void {
    const today = this.calendar.getToday();
    this.setDateRange(today, today);
    this.selected.emit(this.dateRange);
    this.close();
  }

  selectActualWeek(): void {
    const { from, to } = this.getCurrentWeek();
    this.setDateRange(from, to);
    this.selected.emit(this.dateRange);
    this.close();
  }

  private toDateRange(from: NgbDate | Date | null, to: NgbDate | Date | null): FilterDateRange {
    return {
      startDate: from ? this.convertToDate(from) : null,
      endDate: to ? this.convertToDate(to) : null,
    };
  }

  private isParent(child: EventTarget, parent: EventTarget): boolean {
    let node = child;

    while (node && node !== parent) {
      node = this.renderer.parentNode(node);
    }

    return !!node;
  }
}
