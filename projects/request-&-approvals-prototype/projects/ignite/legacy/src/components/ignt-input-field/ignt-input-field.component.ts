import { NgClass, NgFor } from '@angular/common';
import {
  AfterViewInit,
  booleanAttribute,
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
  input,
  Input,
  InputSignal,
  InputSignalWithTransform,
  OnInit,
  output,
  Output,
  PipeTransform,
  Signal,
  signal,
  untracked,
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

import { FormInputFieldType } from '@fz-original/app/app/enums/html-tag.enum';
import { FormInputFieldValue } from '@fz-original/app/app/models/html-tag.model';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntIconComponent } from '@ignite/icon';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldType, IngtFormError } from '@ignite/legacy/models/ignt-input.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NgClass, NgFor, IconsModule, IgntFieldErrorComponent, IgntIconButtonComponent, IgntIconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IgntInputFieldComponent),
      multi: true,
    },
  ],
  selector: 'ignt-input-field',
  standalone: true,
  styleUrls: ['./ignt-input-field.component.scss'],
  templateUrl: './ignt-input-field.component.html',
})
export class IgntInputFieldComponent implements ControlValueAccessor, OnInit, AfterViewInit {
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #disabled: WritableSignal<boolean> = signal(false);
  #formErrors: WritableSignal<ValidationErrors | null> = signal<ValidationErrors | null>(null);
  #injector = inject(Injector);
  #inputValue: FormInputFieldValue | null = null;
  #ngControl: NgControl | null = null;

  #onChange: (value: FormInputFieldValue | null) => void = () => {};
  #onTouch: (value: FormInputFieldValue | null) => void = () => {};
  leadIcon: InputSignal<[string, string] | null> = input<[string, string] | null>(null);
  isTrailIconDisabled = input(false, { transform: booleanAttribute });
  isTrailIconLoading = input(false, { transform: booleanAttribute });
  trailIcon: InputSignal<[string, string] | null> = input<[string, string] | null>(null);
  trailIconAriaLabel: InputSignal<string> = input<string>('');
  protected readonly trailIconAction: Signal<[string, string] | null> = computed(() => {
    const icon = this.trailIcon();
    if (icon === null || this.trailIconAriaLabel().length === 0) {
      return null;
    }
    return icon;
  });
  readonly trailIconClicked = output<void>();

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
  @Input() customFormErrors: IngtFormError[] = [];
  id: InputSignal<string> = input<string>('');
  dataTestId: Signal<string> = computed<string>(() => `text-field__${this.id()}`);
  @Input()
  get disabled(): boolean {
    return this.#disabled();
  }
  set disabled(value: boolean) {
    this.#disabled.set(value);
  }
  formControl: FormControl | null = null;
  @Input() formControlName = '';
  hasErrors: WritableSignal<boolean> = signal(false);
  @Input() helperText = '';
  hideErrorLabels: InputSignal<boolean> = input<boolean>(false);
  maxlength: InputSignal<number | null> = input<number | null>(null);
  minValue: InputSignal<number | null> = input<number | null>(null);
  warning: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });
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
  @ViewChild('input') inputElement!: ElementRef;
  @Input({ required: true }) label!: string;
  @Input() pipe: PipeTransform | null = null;
  @Input() pipeArgs: unknown[] = [];
  @Input() placeholder = '';
  @Input() placeholderAsEmptyValue = false;
  readonly: InputSignal<boolean> = input<boolean>(false);
  shouldAddHasErrorCSSClass: Signal<boolean> = computed<boolean>(
    () => (this.igntErrors().length > 0 || this.hasErrors()) && !this.readonly(),
  );
  shouldShowErrorLabels: Signal<boolean> = computed<boolean>(
    () => this.igntErrors().length > 0 && !this.hideErrorLabels() && !this.readonly(),
  );
  @Input() type = FormInputFieldType[FormInputFieldType.text] as IgntInputFieldType;

  ngAfterViewInit(): void {
    /**
     * A form control can be defined as part of a form group
     * or an independent new FormControl().
     */
    this.formControl = (this.#ngControl as FormControlDirective).form ?? (this.#ngControl as FormControlName).control;
    this.formControl.valueChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#changeDetectorRef.markForCheck());
    this.formControl.statusChanges.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((formControlStatus: FormControlStatus) => {
      if (formControlStatus === 'INVALID') {
        this.hasErrors.set(true);
        this.#formErrors.set((this.formControl as FormControl).errors);
      } else {
        this.hasErrors.set(false);
        this.#formErrors.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.#ngControl = this.#injector.get(NgControl);
    if (this.#ngControl == null) {
      throw new Error('Please assign <ignt-input-field> to a form control');
    }
  }

  onBlur(): void {
    this.blurred.emit();
    this.#onTouch(this.#inputValue);
  }

  protected onTrailIconClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled || this.readonly() || this.isTrailIconLoading() || this.isTrailIconDisabled()) {
      return;
    }
    this.trailIconClicked.emit();
  }

  registerOnChange(fn: () => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    untracked(() => {
      this.#disabled.set(isDisabled);
    });
    this.#changeDetectorRef.markForCheck();
  }

  writeValue(value: FormInputFieldValue): void {
    this.#inputValue = this.pipe !== null ? this.pipe.transform(value, ...this.pipeArgs) : value;
    this.#changeDetectorRef.markForCheck();
  }
}
