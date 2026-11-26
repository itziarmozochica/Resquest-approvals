import { Component, ElementRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

import moment from 'moment-timezone';
import { DeviceDetectorService } from 'ngx-device-detector';

import { SelectOption } from '../select/select.interface';

const DATE_TIME_PLACEHOLDER = { id: -1, title: '--:--' };
@Component({
  selector: 'app-date-range-time',
  standalone: false,
  styleUrls: ['./date-range.component.scss', './date-time-range.component.scss'],
  templateUrl: './date-time-range.component.html',
})
export class FilterDateTimeRangeComponent implements OnChanges {
  #deviceDetectorService = inject(DeviceDetectorService);
  dateSelected: Date | undefined = undefined;
  @Input() dateTimeList: string[] = [];
  dateTimeOptions: SelectOption[] = [];
  @ViewChild('desktopDateInput') desktopDateInput?: ElementRef<HTMLInputElement>;
  @Input() disabled = false;
  @Input() initialDateShown = true;
  initialDateTimeOption: SelectOption = DATE_TIME_PLACEHOLDER;
  isMobile = this.#deviceDetectorService.isMobile() ?? false;
  @Input() queryDate: Date | null = null;
  @Output() selectDateEmitter = new EventEmitter<Date | undefined>();
  @Output() selectDateTimeEmitter = new EventEmitter<SelectOption>();
  @Input() selectedDateTime = '';
  @Input() showTimePicker = true;
  timeSelectValue: string | number = '';
  @Input() timezone = '';
  @ViewChild('mobileDateInput') mobileDateInput?: ElementRef<HTMLInputElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes?.queryDate && !Object.is(changes.queryDate.currentValue, changes.queryDate.previousValue)) {
      this.initialDateTimeOption = DATE_TIME_PLACEHOLDER;
      this.dateTimeOptions = [];
      this.timeSelectValue = '';
      this.setDateRange(this.queryDate);
    }
    if (changes?.dateTimeList?.currentValue) {
      const format = 'HH:mm';
      let dateTitle: string;
      this.dateTimeOptions = this.dateTimeList.map(value => {
        dateTitle = moment(value).tz(this.timezone).format(format);
        return { id: value, title: dateTitle };
      });
      const lastSelectedDateTime = (this.dateTimeOptions ?? []).find(option => option.id === this.selectedDateTime);
      this.initialDateTimeOption = lastSelectedDateTime ?? this.dateTimeOptions?.[0] ?? DATE_TIME_PLACEHOLDER;
      this.timeSelectValue =
        this.dateTimeOptions.length === 0 || this.initialDateTimeOption.id === DATE_TIME_PLACEHOLDER.id
          ? ''
          : String(this.initialDateTimeOption.id);
    }
  }

  onDesktopCalendarIconClick(event: Event): void {
    this.#openNativeDatePicker(event, this.desktopDateInput?.nativeElement);
  }

  onMobileCalendarIconClick(event: Event): void {
    this.#openNativeDatePicker(event, this.mobileDateInput?.nativeElement);
  }

  onNativeFromDateSelection(date: string): void {
    if (!date) {
      return;
    }
    const [year, month, day] = date.split('-').map(val => Number(val));
    this.dateSelected = new Date(Date.UTC(year, month - 1, day));
    this.selectDateEmitter.emit(this.dateSelected);
  }

  onTimeSelectChange(value: string | number): void {
    const valueStr = String(value);
    const selectedOption = this.dateTimeOptions.find(option => String(option.id) === valueStr);
    if (!selectedOption) {
      return;
    }
    this.timeSelectValue = valueStr;
    this.selectDateTimeEmitter.emit(selectedOption);
  }

  setDateRange(from: Date | null): void {
    if (from == null || Number.isNaN(from.getTime())) {
      this.dateSelected = undefined;
      return;
    }
    this.dateSelected = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  }

  #openNativeDatePicker(event: Event, input: HTMLInputElement | undefined): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    try {
      input?.showPicker?.();
    } catch (error: unknown) {
      // Do not cancel the click so the wrapping label can open the native picker.
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return;
      }
      throw error;
    }
    event.preventDefault();
    event.stopPropagation();
  }
}
