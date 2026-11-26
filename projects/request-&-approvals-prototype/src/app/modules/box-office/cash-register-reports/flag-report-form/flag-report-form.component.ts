import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule } from '@ngx-translate/core';

export interface FlagReportFormData {
  title: string;
  description: string;
}

@Component({
  selector: 'app-flag-report-form',
  standalone: true,
  templateUrl: './flag-report-form.component.html',
  styleUrls: ['./flag-report-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf, ReactiveFormsModule, TranslateModule, IgntButtonComponent, IgntInputFieldComponent, IgntTextareaFieldComponent],
})
export class FlagReportFormComponent implements OnChanges {
  @Input() reportId = '';
  @Output() formSubmit = new EventEmitter<FlagReportFormData>();

  flagForm = new FormGroup({
    title: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
      updateOn: 'blur',
    }),
    description: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1000)],
      updateOn: 'blur',
    }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.reportId?.currentValue) {
      this.flagForm.reset();
    }
  }

  submit(): void {
    if (this.flagForm.invalid) {
      this.flagForm.markAllAsTouched();
      return;
    }

    this.formSubmit.emit(this.flagForm.getRawValue());
  }
}
