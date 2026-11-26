import { ChangeDetectionStrategy, Component, computed, forwardRef, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, UntypedFormGroup } from '@angular/forms';

import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { TranslateModule } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { combineLatest, map, merge, Observable, of, switchMap } from 'rxjs';

import { BookingQuestion } from '../../../../../shared/booking-questions/models';
import { getBookingQuestionControlId } from '../../../../../shared/utils/booking-questions.utils';
import { KioskDatePickerComponent } from '../../kiosk-date-picker/kiosk-date-picker.component';

interface DateQuestionItemError {
  message: string;
  name: string;
}

interface BookingQuestionControlState {
  invalid: boolean;
  touched: boolean;
  value: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntFieldErrorComponent, KioskDatePickerComponent, ReactiveFormsModule, TranslateModule],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KioskDateQuestionItemComponent),
    },
  ],
  selector: 'app-kiosk-date-question-item',
  standalone: true,
  templateUrl: './kiosk-date-question-item.component.html',
})
export class KioskDateQuestionItemComponent implements ControlValueAccessor {
  readonly formGroup = input.required<UntypedFormGroup>();
  readonly question = input.required<BookingQuestion>();
  readonly controlId = input<string>();

  readonly dateErrors: ReadonlyArray<DateQuestionItemError> = [
    { message: 'bookingQuestionsForm.validations.required', name: 'required' },
    { message: 'bookingQuestionsForm.validations.dateOutsideRange', name: 'range' },
    { message: 'bookingQuestionsForm.validations.invalid', name: 'invalid' },
    { message: 'bookingQuestionsForm.error.rejectedByServer', name: 'server' },
  ];

  protected readonly resolvedControlName = computed(
    () =>
      this.controlId() ||
      getBookingQuestionControlId({
        questionId: this.question().id,
        sessionTypeId: this.question().sessionTypeId,
      }),
  );

  readonly control = computed(() => this.formGroup().get(this.resolvedControlName()));

  readonly #controlState = toSignal(
    combineLatest([toObservable(this.formGroup), toObservable(this.resolvedControlName)]).pipe(
      switchMap(([formGroup, controlName]) => this.#watchControlState(formGroup, controlName)),
    ),
    { initialValue: { invalid: false, touched: false, value: null } as BookingQuestionControlState },
  );

  readonly hasError = computed(() => {
    const { invalid, touched } = this.#controlState();
    return touched && invalid;
  });

  readonly maxDate = computed((): string | null => {
    const rangeMax = this.question()?.range?.max;
    return rangeMax ?? null;
  });

  readonly minDate = computed((): string | null => {
    const rangeMin = this.question()?.range?.min;
    return rangeMin ?? null;
  });

  readonly startDate = computed(() => this.#controlState().value);

  protected readonly controlTouched = computed(() => this.#controlState().touched);

  isDisabled = false;
  timezone = moment.tz.guess();

  onChange?: (value: string) => void;
  onTouched?: () => void;

  onDateSelected(value: string | null): void {
    this.onTouched?.();
    this.onChange?.(value ?? '');
    this.writeValue(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  writeValue(value: string | null): void {
    this.control()?.setValue(value);
  }

  #watchControlState(formGroup: UntypedFormGroup, controlName: string) {
    const control = formGroup.get(controlName);
    if (!control) {
      return of<BookingQuestionControlState>({ invalid: false, touched: false, value: null });
    }

    const readState = (): BookingQuestionControlState => ({
      invalid: control.invalid,
      touched: control.touched,
      value: (control.value as string | null) ?? null,
    });

    return merge(
      of(readState()),
      control.valueChanges.pipe(map(readState)),
      control.statusChanges.pipe(map(readState)),
      formGroup.statusChanges.pipe(map(readState)),
      formGroup.valueChanges.pipe(map(readState)),
      ...this.#controlEventStreams(control, readState),
      ...this.#controlEventStreams(formGroup, readState),
    );
  }

  #controlEventStreams(
    source: UntypedFormGroup | NonNullable<ReturnType<UntypedFormGroup['get']>>,
    readState: () => BookingQuestionControlState,
  ): Observable<BookingQuestionControlState>[] {
    const events = (source as { events?: Observable<unknown> }).events;
    if (!events) {
      return [];
    }

    return [events.pipe(map(readState))];
  }
}
