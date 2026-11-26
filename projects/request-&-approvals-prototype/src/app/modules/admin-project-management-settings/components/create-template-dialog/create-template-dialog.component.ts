import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-create-template-dialog',
  templateUrl: './create-template-dialog.component.html',
  styleUrls: ['./create-template-dialog.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, IgntButtonComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTemplateDialogComponent {
  @Output() confirm = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  readonly #fb = inject(FormBuilder);

  readonly form = this.#fb.group({
    label: ['', [Validators.required, Validators.minLength(1)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirm.emit((this.form.controls.label.value ?? '').trim());
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
