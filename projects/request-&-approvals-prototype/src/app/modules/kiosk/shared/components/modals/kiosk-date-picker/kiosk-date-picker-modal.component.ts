import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { NgbCalendar, NgbDate, NgbDatepicker, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';

import { KioskButtonComponent } from '../../button/kiosk-button.component';
import { IconButtonComponent } from '../../icon-button/icon-button.component';
import { KioskDatePickerModalData } from './kiosk-date-picker-modal.model';

interface KioskDatePickerMonthOption {
  label: string;
  value: number;
}

type KioskDatePickerDropdown = 'month' | 'year';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [IconButtonComponent, IgntDialogModule, IgntIconComponent, KioskButtonComponent, NgbDatepickerModule, TranslateModule],
  selector: 'app-kiosk-date-picker-modal',
  standalone: true,
  styleUrls: ['../kiosk-base-modals.styles.scss', './kiosk-date-picker-modal.component.scss'],
  templateUrl: './kiosk-date-picker-modal.component.html',
})
export class KioskDatePickerModalComponent implements OnInit {
  static readonly defaultPastYearSpan = 100;

  #cdr = inject(ChangeDetectorRef);
  #dialogRef = inject<IgntDialogRef<string | null | undefined>>(IGNT_DIALOG_REF);
  #ngbCalendar = inject(NgbCalendar);
  #translateService = inject(TranslateService);
  data = inject<KioskDatePickerModalData>(IGNT_DIALOG_DATA);

  protected readonly datepicker = viewChild<NgbDatepicker>('datepicker');
  protected readonly monthListbox = viewChild<ElementRef<HTMLElement>>('monthListbox');
  protected readonly yearListbox = viewChild<ElementRef<HTMLElement>>('yearListbox');

  protected pendingDate = signal<NgbDate | null>(null);
  protected displayedMonth = signal<number>(this.#ngbCalendar.getToday().month);
  protected displayedYear = signal<number>(this.#ngbCalendar.getToday().year);
  protected openDropdown = signal<KioskDatePickerDropdown | null>(null);

  protected monthOptions = computed<KioskDatePickerMonthOption[]>(() => this.#buildMonthOptions());
  protected monthTriggerLabel = computed<string>(() => {
    const month = this.monthOptions().find(option => option.value === this.displayedMonth());
    if (!month) return '';
    const selected = this.pendingDate();
    const showDay = selected !== null && selected.month === this.displayedMonth() && selected.year === this.displayedYear();
    return showDay ? `${month.label} ${selected.day}` : month.label;
  });
  protected yearOptions = computed<number[]>(() => this.#buildYearOptions());

  apply(): void {
    const selected = this.pendingDate();
    if (!selected) {
      this.#dialogRef.close(null);
      return;
    }
    const isoDate = `${selected.year}-${this.#pad(selected.month)}-${this.#pad(selected.day)}`;
    this.#dialogRef.close(isoDate);
  }

  close(): void {
    this.#dialogRef.close(undefined);
  }

  get maxNgbDate(): NgbDate | null {
    return this.#toGuardedNgbDate(this.data.maxDate);
  }

  get minNgbDate(): NgbDate | null {
    return this.#toGuardedNgbDate(this.data.minDate);
  }

  ngOnInit(): void {
    const parsed = this.#parseStartDate(this.data.initialDate, this.data.timezone);
    if (parsed) {
      this.pendingDate.set(parsed);
      this.displayedMonth.set(parsed.month);
      this.displayedYear.set(parsed.year);
    }
  }

  protected closeDropdown(): void {
    this.openDropdown.set(null);
  }

  protected isDropdownOpen(name: KioskDatePickerDropdown): boolean {
    return this.openDropdown() === name;
  }

  protected navigate(monthsDelta: number): void {
    const datepicker = this.datepicker();
    if (!datepicker?.state || !datepicker?.calendar) {
      return;
    }
    const { calendar, state } = datepicker;
    const nextDate = calendar.getNext(state.firstDate, 'm', monthsDelta);
    if (this.#isOutsideNavigationBounds(nextDate)) {
      return;
    }
    datepicker.navigateTo(nextDate);
  }

  protected onDatepickerNavigate(targetDate: { month: number; year: number }): void {
    this.displayedMonth.set(targetDate.month);
    this.displayedYear.set(targetDate.year);
    this.#cdr.markForCheck();
  }

  protected onDateSelect(date: NgbDate): void {
    const normalized = new NgbDate(this.displayedYear(), this.displayedMonth(), date.day);
    this.pendingDate.set(normalized);
  }

  protected onMonthChange(month: number): void {
    this.displayedMonth.set(month);
    this.datepicker()?.navigateTo({ day: 1, month, year: this.displayedYear() });
    this.#syncPendingDateWithDisplayed();
    this.closeDropdown();
  }

  protected onYearChange(year: number): void {
    const month = this.#clampMonthForYear(year, this.displayedMonth());
    this.displayedMonth.set(month);
    this.displayedYear.set(year);
    this.datepicker()?.navigateTo({ day: 1, month, year });
    this.#syncPendingDateWithDisplayed();
    this.closeDropdown();
  }

  protected toggleDropdown(name: KioskDatePickerDropdown): void {
    const next = this.openDropdown() === name ? null : name;
    this.openDropdown.set(next);
    if (next !== null) {
      queueMicrotask(() => this.#scrollSelectedOptionIntoView(next));
    }
  }

  #buildMonthOptions(): KioskDatePickerMonthOption[] {
    const language = this.#translateService.currentLang || this.#translateService.defaultLang || 'en';
    const formatter = new Intl.DateTimeFormat(language, {
      month: 'short',
      timeZone: 'UTC',
    });
    const year = this.displayedYear();
    const min = this.minNgbDate;
    const max = this.maxNgbDate;
    const options: KioskDatePickerMonthOption[] = [];
    for (let month = 1; month <= 12; month++) {
      if (min && (year < min.year || (year === min.year && month < min.month))) continue;
      if (max && (year > max.year || (year === max.year && month > max.month))) continue;
      options.push({
        label: formatter.format(new Date(Date.UTC(2020, month - 1, 1))),
        value: month,
      });
    }
    return options;
  }

  #buildYearOptions(): number[] {
    const today = this.#ngbCalendar.getToday();
    const min = this.minNgbDate;
    const max = this.maxNgbDate;
    const fromYear = min ? min.year : today.year - KioskDatePickerModalComponent.defaultPastYearSpan;
    const toYear = max ? max.year : today.year;
    if (toYear < fromYear) return [today.year];
    const years: number[] = [];
    for (let year = toYear; year >= fromYear; year--) {
      years.push(year);
    }
    return years;
  }

  #clampDayForMonth(day: number, month: number, year: number): number {
    return Math.min(day, new Date(year, month, 0).getDate());
  }

  #clampMonthForYear(year: number, month: number): number {
    const min = this.minNgbDate;
    const max = this.maxNgbDate;
    if (min && year === min.year && month < min.month) return min.month;
    if (max && year === max.year && month > max.month) return max.month;
    return month;
  }

  #pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  #parseStartDate(startDate: string | null, timezone: string | null | undefined): NgbDate | null {
    if (startDate === null || startDate.trim().length === 0) return null;
    if (!moment(startDate, moment.ISO_8601, true).isValid()) return null;
    const parsed = timezone && timezone.trim().length > 0 ? moment.tz(startDate, timezone) : moment(startDate);
    if (!parsed.isValid()) return null;
    return this.#toNgbDateInTimezone(parsed);
  }

  #isOutsideNavigationBounds(targetDate: NgbDate): boolean {
    const min = this.minNgbDate;
    if (min && (targetDate.year < min.year || (targetDate.year === min.year && targetDate.month < min.month))) {
      return true;
    }

    const max = this.maxNgbDate;
    if (max && (targetDate.year > max.year || (targetDate.year === max.year && targetDate.month > max.month))) {
      return true;
    }

    return false;
  }

  #scrollSelectedOptionIntoView(dropdown: KioskDatePickerDropdown): void {
    const listbox = dropdown === 'month' ? this.monthListbox : this.yearListbox;
    const listboxRef = listbox();
    if (!listboxRef) return;
    const listboxEl = listboxRef.nativeElement;
    const selected = listboxEl.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!selected) return;
    const targetTop = selected.offsetTop - (listboxEl.clientHeight - selected.offsetHeight) / 2;
    const maxScroll = listboxEl.scrollHeight - listboxEl.clientHeight;
    listboxEl.scrollTop = Math.max(0, Math.min(targetTop, maxScroll));
  }

  #syncPendingDateWithDisplayed(): void {
    const current = this.pendingDate();
    if (current === null) return;
    const month = this.displayedMonth();
    const year = this.displayedYear();
    if (current.month === month && current.year === year) return;
    this.pendingDate.set(new NgbDate(year, month, this.#clampDayForMonth(current.day, month, year)));
  }

  #toGuardedNgbDate(date: string | null): NgbDate | null {
    if (date === null || date.trim().length === 0) return null;
    const tz = this.data.timezone;
    const parsed = tz && tz.trim().length > 0 ? moment.tz(date, 'YYYY-MM-DD', true, tz) : moment(date, 'YYYY-MM-DD', true);
    if (!parsed.isValid()) return null;
    return this.#toNgbDateInTimezone(parsed);
  }

  #toNgbDateInTimezone(date: moment.Moment): NgbDate {
    const [year, month, day] = date.format('YYYY-MM-DD').split('-').map(Number);
    return new NgbDate(year, month, day);
  }
}
