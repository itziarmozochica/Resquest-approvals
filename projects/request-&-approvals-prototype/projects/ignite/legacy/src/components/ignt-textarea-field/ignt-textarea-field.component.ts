import { NgClass } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  EventEmitter,
  forwardRef,
  inject,
  Injector,
  Input,
  OnInit,
  Output,
  PipeTransform,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  FormControlDirective,
  FormControlName,
  FormControlStatus,
  FormsModule,
  NG_VALUE_ACCESSOR,
  NgControl,
  ValidationErrors,
} from '@angular/forms';

import { FormInputFieldValue } from '@fz-original/app/app/models/html-tag.model';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgClass, IgntFieldErrorComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IgntTextareaFieldComponent),
      multi: true,
    },
  ],
  selector: 'ignt-textarea-field',
  standalone: true,
  styleUrls: ['./ignt-textarea-field.component.scss'],
  templateUrl: './ignt-textarea-field.component.html',
})
export class IgntTextareaFieldComponent implements ControlValueAccessor, OnInit, AfterViewInit {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #formErrors: WritableSignal<ValidationErrors | null> = signal<ValidationErrors | null>(null);

  #injector = inject(Injector);
  #inputValue: FormInputFieldValue | null = null;
  #ngControl: NgControl | null = null;

  get inputValue(): FormInputFieldValue | null {
    return this.#inputValue;
  }
  set inputValue(value: FormInputFieldValue) {
    this.#inputValue = this.pipe !== null ? this.pipe.transform(value, ...this.pipeArgs) : value;
    this.#onChange(value);
    this.#onTouch(value);
  }

  @Input()
  set value(value: FormInputFieldValue | null) {
    if (value !== null) {
      this.inputValue = value;
    }
  }

  @Output() blurred = new EventEmitter<void>();
  @Input() class = '';
  @Input() cols?: number;
  @Input() customFormErrors: IngtFormError[] = [];
  @Input() disabled = false;
  formControl: FormControl | null = null;
  @Input() formControlName = '';
  hasErrors = false;
  @Input() helperText = '';
  @Input() id!: string;
  igntErrors: Signal<IngtFormError[]> = computed<IngtFormError[]>(() => {
    const igntErrors: ValidationErrors | null = this.#formErrors();

    if (igntErrors === null) {
      return [];
    }
    this.customFormErrors.forEach((igntFormError: IngtFormError) => {
      const igntError = igntErrors[igntFormError.type];
      if (igntError) {
        igntErrors[igntFormError.type] = igntFormError;
      }
    });
    return Object.keys(igntErrors).map((type: string) => ({ type, ...igntErrors[type] }));
  });
  @Input({ required: true }) label!: string;
  @Input() maxlength?: number;
  @Input() minlength?: number;
  @Input() pipe: PipeTransform | null = null;
  @Input() pipeArgs: unknown[] = [];
  @Input() placeholder = '';
  @Input() placeholderAsEmptyValue = false;
  @Input() readonly = false;
  @Input() resize: 'none' | 'both' | 'horizontal' | 'vertical' = 'vertical';
  @Input() rows = 3;
  @ViewChild('textarea') textareaElement!: ElementRef;

  ngAfterViewInit(): void {
    /**
     * A form control can be defined as part of a form group
     * or an independent new FormControl().
     */
    this.formControl = (this.#ngControl as FormControlDirective).form ?? (this.#ngControl as FormControlName).control;
    this.formControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#changeDetectorRef.markForCheck());
    this.formControl.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((formControlStatus: FormControlStatus) => {
      if (formControlStatus === 'INVALID') {
        this.hasErrors = true;
        this.#formErrors.set((this.formControl as FormControl).errors);
      } else {
        this.hasErrors = false;
        this.#formErrors.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.#ngControl = this.#injector.get(NgControl);
    if (this.#ngControl == null) {
      throw new Error('Please assign <ignt-textarea-field> to a form control');
    }
  }

  onBlur(): void {
    this.blurred.emit();
    this.#onTouch(this.#inputValue);
  }

  registerOnChange(fn: () => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.#changeDetectorRef.markForCheck();
  }

  writeValue(value: FormInputFieldValue): void {
    this.#inputValue = value;
  }

  #onChange: (value: FormInputFieldValue | null) => void = () => {};

  #onTouch: (value: FormInputFieldValue | null) => void = () => {};
}
