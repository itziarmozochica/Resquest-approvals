import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ReactiveFormsModule, ValidationErrors, Validator } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';

export enum WeekDay {
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
  Sunday = 'sunday',
}

type OnChangeFn = (weekDays: Array<WeekDay>) => void;
export const WEEKDAYS = Object.values(WeekDay);

export type WeekDaySelectorValue = Array<WeekDay>;

@Component({
  selector: 'app-week-days-selector',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: forwardRef(() => WeekDaysSelectorComponent),
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: forwardRef(() => WeekDaysSelectorComponent),
    },
  ],
  standalone: true,
  imports: [CommonModule, TranslateModule, ReactiveFormsModule],
  templateUrl: './week-days-selector.component.html',
  styleUrls: ['./week-days-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekDaysSelectorComponent implements ControlValueAccessor, Validator, OnChanges {
  nonValidSelectedWeekDays: Record<WeekDay, boolean> = {
    [WeekDay.Monday]: false,
    [WeekDay.Tuesday]: false,
    [WeekDay.Wednesday]: false,
    [WeekDay.Thursday]: false,
    [WeekDay.Friday]: false,
    [WeekDay.Saturday]: false,
    [WeekDay.Sunday]: false,
  };

  onChange: OnChangeFn = (): void => {};
  onTouched: () => void = (): void => {};
  onValidatorChange: () => void = (): void => {};

  selectedWeekDaysMap: Record<WeekDay, boolean> = {
    [WeekDay.Monday]: false,
    [WeekDay.Tuesday]: false,
    [WeekDay.Wednesday]: false,
    [WeekDay.Thursday]: false,
    [WeekDay.Friday]: false,
    [WeekDay.Saturday]: false,
    [WeekDay.Sunday]: false,
  };

  @Input() validWeekDays: Array<WeekDay> = WEEKDAYS;
  protected weekDays = WEEKDAYS;
  protected isDisabled = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges({ validWeekDays }: SimpleChanges): void {
    if (validWeekDays) {
      this.onValidatorChange?.();
    }
  }

  registerOnChange(fn: OnChangeFn): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  registerOnValidatorChange?(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.cdr.markForCheck();
  }

  toggleWeekDaySelection(weekDay: WeekDay): void {
    this.onTouched();
    this.selectedWeekDaysMap[weekDay] = !this.selectedWeekDaysMap[weekDay];
    this.nonValidSelectedWeekDays = this.getNonValidSelectedWeekDays();
    this.onChange(this.getWeekDaysWithTrueValue(this.selectedWeekDaysMap));
  }

  validate(): ValidationErrors | null {
    this.nonValidSelectedWeekDays = this.getNonValidSelectedWeekDays();
    const nonValidSelectedWeekDays = this.getWeekDaysWithTrueValue(this.nonValidSelectedWeekDays);
    return nonValidSelectedWeekDays.length ? { nonValidSelectedWeekDays } : null;
  }

  writeValue(value: WeekDaySelectorValue): void {
    this.selectedWeekDaysMap = Object.fromEntries(WEEKDAYS.map(weekDay => [weekDay, value.includes(weekDay)])) as Record<WeekDay, boolean>;
    this.nonValidSelectedWeekDays = this.getNonValidSelectedWeekDays();
    this.cdr.markForCheck();
  }

  private getNonValidSelectedWeekDays(): Record<WeekDay, boolean> {
    return Object.fromEntries(
      WEEKDAYS.map(weekDay => [weekDay, this.selectedWeekDaysMap[weekDay] && !this.validWeekDays?.includes(weekDay)]),
    ) as Record<WeekDay, boolean>;
  }

  private getWeekDaysWithTrueValue(values: Record<WeekDay, boolean>): Array<WeekDay> {
    return Object.entries(values)
      .filter(([, value]) => value)
      .map(([weekDay]) => weekDay as WeekDay);
  }
}
