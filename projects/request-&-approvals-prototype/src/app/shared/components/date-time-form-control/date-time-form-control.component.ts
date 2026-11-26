import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';

import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';

interface DateAndTime {
  date: string | null;
  time: string | null;
}

@Component({
  selector: 'app-date-time-form-control',
  standalone: false,
  templateUrl: 'date-time-form-control.component.html',
  styleUrls: ['./date-time-form-control.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      multi: true,
      useExisting: DateTimeFormControlComponent,
    },
    {
      provide: NG_VALIDATORS,
      multi: true,
      useExisting: DateTimeFormControlComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateTimeFormControlComponent implements ControlValueAccessor, Validator, OnInit {
  #datetime: Date | null = null;
  #destroyRef = inject(DestroyRef);
  #formBuilder = inject(FormBuilder);
  #onChange: ((datetime: Date | null) => void) | null = null;
  #requiredValue = signal(false);
  #timezoneValue = 'UTC';
  #translateService = inject(TranslateService);

  @Output() dateChange = new EventEmitter<Date | null>();
  dateError = computed<string | null>(() => {
    if (this.dateErrorMessage()) {
      return this.dateErrorMessage();
    }
    if (this.required && this.dateTouched() && this.dateInvalid()) {
      return this.#translateService.instant('common.requiredField');
    }
    return null;
  });
  dateErrorMessage = input<string | null>(null);
  dateHasError = computed<boolean>(() => {
    return this.dateError() !== null;
  });
  @ViewChild('dateInput', { static: false }) dateInput!: ElementRef<HTMLInputElement>;
  dateInvalid = signal(false);
  @Input() dateLabel = '';
  dateTimeForm: FormGroup<{ [K in keyof DateAndTime]: FormControl }> = this.#formBuilder.group({ date: [null], time: [null] });
  dateTouched = signal(false);
  humanizedDate: string | null = null;
  @Input() humanizedDateFormat = 'DD-MMM-YYYY';
  @Input() humanizedInput = true;
  @Input() maxDate: Date | null = null;
  @Input() minDate: Date | null = null;
  onTouched: () => void;
  onValidatorChange: () => void;
  @Input()
  set required(value: boolean) {
    this.#requiredValue.set(value);
    this.#updateValidators();
  }
  get required(): boolean {
    return this.#requiredValue();
  }

  timeError = computed<string | null>(() => {
    if (this.timeErrorMessage()) {
      return this.timeErrorMessage();
    }
    if (this.required && this.timeTouched() && this.timeInvalid()) {
      return this.#translateService.instant('common.requiredField');
    }
    return null;
  });
  timeErrorMessage = input<string | null>(null);
  timeHasError = computed<boolean>(() => {
    return this.timeError() !== null;
  });
  timeInvalid = signal(false);

  @Input() timeLabel = '';

  timeTouched = signal(false);

  constructor() {
    this.onTouched = () => {};
    this.onValidatorChange = () => {};
    this.dateTimeForm.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((dateAndTime: Partial<DateAndTime>) => {
      if (dateAndTime.date != null) {
        this.humanizedDate = this.#getHumanizedDate(dateAndTime.date);
      }
      if (this.#onChange !== null) {
        let currentDatetime: Date | null = null;
        if (Object.values(dateAndTime).every(value => !!value) && dateAndTime.date != null && dateAndTime.time != null) {
          const momentInTimezone = moment.tz(`${dateAndTime.date} ${dateAndTime.time}:00`, 'YYYY-MM-DD HH:mm:ss', this.timezone);
          currentDatetime = momentInTimezone.utc().toDate();
        }
        if (currentDatetime?.getTime() !== this.#datetime?.getTime()) {
          this.#datetime = currentDatetime;
          this.#onChange(currentDatetime);
          this.onValidatorChange();
          this.dateChange.emit(currentDatetime);
        }
      }
    });
    this.#updateValidators();

    const dateControl = this.dateTimeForm.get('date');
    const timeControl = this.dateTimeForm.get('time');

    dateControl?.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.dateInvalid.set(dateControl?.invalid ?? false);
    });

    timeControl?.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.timeInvalid.set(timeControl?.invalid ?? false);
    });
  }

  getDateForInput(date: Date | null): string {
    if (!date) {
      return '';
    }
    return moment(date).tz(this.timezone).format('YYYY-MM-DD');
  }

  markAsTouched(): void {
    this.dateTimeForm.get('date')?.markAsTouched();
    this.dateTimeForm.get('time')?.markAsTouched();
    this.dateTouched.set(true);
    this.timeTouched.set(true);
    this.onTouched();
    this.onValidatorChange();
  }

  ngOnInit(): void {
    this.#updateValidators();
  }

  openDatePicker(): void {
    this.dateInput.nativeElement.showPicker();
  }

  openPicker(picker: HTMLInputElement): void {
    try {
      picker.showPicker();
    } catch {
      return;
    }
  }

  registerOnChange(onChange: (datetime: Date | null) => void): void {
    this.#onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  setDisabledState(disabled: boolean): void {
    if (disabled) {
      this.dateTimeForm.disable();
    } else {
      this.dateTimeForm.enable();
    }
  }

  @Input()
  set timezone(value: string | null | undefined) {
    const timezone = value ?? 'UTC';
    if (timezone === this.#timezoneValue) {
      return;
    }
    this.#timezoneValue = timezone;
    this.#render();
  }
  get timezone(): string {
    return this.#timezoneValue;
  }

  validate(): ValidationErrors | null {
    if (!this.required) {
      return null;
    }

    const dateControl = this.dateTimeForm.get('date');
    const timeControl = this.dateTimeForm.get('time');

    const errors: ValidationErrors = {};

    if (dateControl?.invalid) {
      errors['dateRequired'] = true;
    }

    if (timeControl?.invalid) {
      errors['timeRequired'] = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  writeValue(datetime: Date | null): void {
    this.#datetime = datetime;
    this.#render();
  }

  #getHumanizedDate(date: string): string | null {
    const validDate: Date | null = this.#getValidDate(date);
    if (validDate !== null) {
      return moment(validDate).format(this.humanizedDateFormat);
    }
    return null;
  }

  #getValidDate(datePart: string): Date | null {
    const currentDatetime = new Date(`${datePart}T00:00:00`);
    if (!isNaN(currentDatetime?.getDate())) {
      return currentDatetime;
    }
    return null;
  }

  #render(): void {
    if (this.#datetime === null) {
      this.dateTimeForm.setValue({ date: null, time: null }, { emitEvent: false });
      this.humanizedDate = null;
      this.#syncInvalidSignals();
      return;
    }

    const tzMoment = moment.tz(this.#datetime, this.timezone);
    const dateString = tzMoment.format('YYYY-MM-DD');
    const timeString = tzMoment.format('HH:mm');
    this.dateTimeForm.setValue({ date: dateString, time: timeString }, { emitEvent: false });
    this.humanizedDate = this.#getHumanizedDate(dateString);
    this.#syncInvalidSignals();
  }

  #syncInvalidSignals(): void {
    this.dateInvalid.set(this.dateTimeForm.get('date')?.invalid ?? false);
    this.timeInvalid.set(this.dateTimeForm.get('time')?.invalid ?? false);
  }

  #updateValidators(): void {
    const dateControl = this.dateTimeForm.get('date');
    const timeControl = this.dateTimeForm.get('time');

    if (this.required) {
      dateControl?.setValidators([Validators.required]);
      timeControl?.setValidators([Validators.required]);
    } else {
      dateControl?.clearValidators();
      timeControl?.clearValidators();
    }

    dateControl?.updateValueAndValidity({ emitEvent: false });
    timeControl?.updateValueAndValidity({ emitEvent: false });
    this.#syncInvalidSignals();
    this.onValidatorChange();
  }
}
