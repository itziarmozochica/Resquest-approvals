import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { IGNT_DIALOG_REF, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ToastService } from '../../../shared/services/toast/toast.service';
import {
  IncidenceCategory,
  IncidenceReportService,
  IncidenceSeverity,
  ReportIncidenceError,
} from '../../services/incidence-report.service';

type IncidenceForm = FormGroup<{
  title: FormControl<string>;
  description: FormControl<string>;
  category: FormControl<IncidenceCategory | ''>;
  severity: FormControl<IncidenceSeverity | ''>;
}>;

function trimmedMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const trimmed = ((control.value as string) ?? '').trim();
    if (trimmed.length === 0 || trimmed.length >= min) {
      return null;
    }
    return { minlength: { requiredLength: min, actualLength: trimmed.length } };
  };
}

@Component({
  selector: 'app-incidence-report-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslateModule, IgntDialogModule, IgntButtonComponent],
  templateUrl: './incidence-report-modal.component.html',
  styleUrls: ['./incidence-report-modal.component.scss'],
})
export class IncidenceReportModalComponent {
  static readonly TITLE_MAX_LENGTH = 100;
  static readonly DESCRIPTION_MIN_LENGTH = 20;
  static readonly DESCRIPTION_MAX_LENGTH = 2000;

  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<boolean>;
  readonly #formBuilder = inject(NonNullableFormBuilder);
  readonly #incidenceReportService = inject(IncidenceReportService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  readonly categories: IncidenceCategory[] = ['technical', 'access', 'billing', 'other'];
  readonly severities: IncidenceSeverity[] = ['low', 'medium', 'high'];
  readonly titleMaxLength = IncidenceReportModalComponent.TITLE_MAX_LENGTH;
  readonly descriptionMinLength = IncidenceReportModalComponent.DESCRIPTION_MIN_LENGTH;
  readonly descriptionMaxLength = IncidenceReportModalComponent.DESCRIPTION_MAX_LENGTH;

  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly form: IncidenceForm = this.#formBuilder.group({
    title: this.#formBuilder.control('', [
      Validators.required,
      Validators.pattern(/\S/),
      Validators.maxLength(IncidenceReportModalComponent.TITLE_MAX_LENGTH),
    ]),
    description: this.#formBuilder.control('', [
      Validators.required,
      Validators.pattern(/\S/),
      trimmedMinLength(IncidenceReportModalComponent.DESCRIPTION_MIN_LENGTH),
      Validators.maxLength(IncidenceReportModalComponent.DESCRIPTION_MAX_LENGTH),
    ]),
    category: this.#formBuilder.control<IncidenceCategory | ''>('', [Validators.required]),
    severity: this.#formBuilder.control<IncidenceSeverity | ''>('', [Validators.required]),
  });

  showError(controlName: string, error: string): boolean {
    const control = this.form.get(controlName);
    if (control === null) {
      return false;
    }
    return control.touched === true && control.hasError(error) === true;
  }

  descriptionLength(): number {
    return this.form.controls.description.value.length;
  }

  cancel(): void {
    this.#dialogRef.close(false);
  }

  submit(): void {
    if (this.form.invalid === true || this.isSubmitting() === true) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const value = this.form.getRawValue();
    this.#incidenceReportService
      .report({
        title: value.title.trim(),
        description: value.description.trim(),
        category: value.category as IncidenceCategory,
        severity: value.severity as IncidenceSeverity,
      })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.#toastService.add({
            autoHide: true,
            delay: 4000,
            message: this.#translateService.instant('incidenceReport.success'),
            sentiment: AlertSentiment.positive,
          });
          this.#dialogRef.close(true);
        },
        error: (err: ReportIncidenceError) => {
          this.isSubmitting.set(false);
          const messageKey = err.rateLimited === true ? 'incidenceReport.rateLimited' : 'incidenceReport.error';
          this.#toastService.add({
            autoHide: true,
            delay: 5000,
            message: this.#translateService.instant(messageKey),
            sentiment: AlertSentiment.danger,
          });
        },
      });
  }
}
