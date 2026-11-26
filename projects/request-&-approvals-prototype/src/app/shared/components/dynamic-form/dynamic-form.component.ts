import { NgClass, NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { DynamicFormConfig, DynamicFormField } from './dynamic-form-field.model';

interface FieldValidationState {
  isInvalid: boolean;
  errorMessage: string;
  ariaDescribedBy: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgFor, NgIf, ReactiveFormsModule, FontAwesomeModule, IgntButtonComponent, TranslateModule],
  selector: 'app-dynamic-form',
  standalone: true,
  styleUrls: ['./dynamic-form.component.scss'],
  templateUrl: './dynamic-form.component.html',
})
export class DynamicFormComponent implements OnInit, OnDestroy {
  @Input() config!: DynamicFormConfig;
  @Input() isLoading = false;

  @Output() formSubmit = new EventEmitter<Record<string, unknown>>();
  @Output() formCancel = new EventEmitter<void>();

  #formBuilder = inject(FormBuilder);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroy$ = new Subject<void>();

  form!: FormGroup;
  fieldStates = new Map<string, FieldValidationState>();
  focusedFields = new Set<string>();

  ngOnInit(): void {
    this.#buildForm();
    this.#subscribeToFormChanges();
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
  }

  #buildForm(): void {
    const group: Record<string, FormControl> = {};

    for (const field of this.config.fields) {
      const validators: ValidatorFn[] = [];

      if (field.required) {
        validators.push(Validators.required);
      }

      if (field.validators && field.validators.length > 0) {
        validators.push(...field.validators);
      }

      group[field.name] = new FormControl(
        {
          value: field.value ?? null,
          disabled: field.disabled ?? false,
        },
        validators,
      );
    }

    this.form = this.#formBuilder.group(group);
    this.#initializeFieldStates();
  }

  #subscribeToFormChanges(): void {
    // Update field states on any form value or status change
    this.form.valueChanges.pipe(takeUntil(this.#destroy$)).subscribe(() => {
      this.#updateFieldStates();
    });

    this.form.statusChanges.pipe(takeUntil(this.#destroy$)).subscribe(() => {
      this.#updateFieldStates();
    });
  }

  #initializeFieldStates(): void {
    for (const field of this.config.fields) {
      this.fieldStates.set(field.name, this.#calculateFieldState(field));
    }
  }

  #updateFieldStates(): void {
    for (const field of this.config.fields) {
      this.fieldStates.set(field.name, this.#calculateFieldState(field));
    }
    this.#changeDetectorRef.markForCheck();
  }

  #calculateFieldState(field: DynamicFormField): FieldValidationState {
    const control = this.getControl(field.name);
    const isInvalid = control ? control.invalid && control.touched : false;
    const errorMessage = isInvalid ? this.#getErrorMessage(field, control) : '';

    let ariaDescribedBy = '';
    if (field.helpText) {
      ariaDescribedBy += `${field.name}-help`;
    }
    if (isInvalid) {
      ariaDescribedBy += ariaDescribedBy ? ` ${field.name}-error` : `${field.name}-error`;
    }

    return {
      isInvalid,
      errorMessage,
      ariaDescribedBy,
    };
  }

  #getErrorMessage(field: DynamicFormField, control: FormControl): string {
    if (!control.errors) {
      return '';
    }

    if (field.errorMessages && field.errorMessages.length > 0) {
      for (const errorMsg of field.errorMessages) {
        if (control.errors[errorMsg.errorKey]) {
          return errorMsg.message;
        }
      }
    }

    // Default error message
    if (control.errors['required']) {
      return `${field.label} is required`;
    }

    return 'Invalid value';
  }

  onSubmit(): void {
    // Mark all fields as touched first to show validation errors
    this.#markAllAsTouched();

    if (this.form.valid) {
      this.formSubmit.emit(this.form.getRawValue());
    }
  }

  onCancel(): void {
    this.formCancel.emit();
  }

  #markAllAsTouched(): void {
    for (const key of Object.keys(this.form.controls)) {
      this.form.get(key)?.markAsTouched();
    }
    this.#updateFieldStates();
  }

  getControl(fieldName: string): FormControl {
    return this.form.get(fieldName) as FormControl;
  }

  getFieldState(fieldName: string): FieldValidationState {
    return (
      this.fieldStates.get(fieldName) ?? {
        isInvalid: false,
        errorMessage: '',
        ariaDescribedBy: '',
      }
    );
  }

  get isSubmitDisabled(): boolean {
    return this.form.invalid || this.isLoading;
  }

  onInputFocus(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    this.focusedFields.add(input.id);
    this.#changeDetectorRef.markForCheck();
  }

  onInputBlur(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    this.focusedFields.delete(input.id);
    this.#changeDetectorRef.markForCheck();
  }

  isFocused(fieldName: string): boolean {
    return this.focusedFields.has(fieldName);
  }
}
