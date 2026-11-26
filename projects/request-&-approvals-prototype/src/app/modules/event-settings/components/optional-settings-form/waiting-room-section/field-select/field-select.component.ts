import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntFieldErrorComponent, NgSelectModule, ReactiveFormsModule, TranslateModule],
  selector: 'app-waiting-room-field-select',
  standalone: true,
  styleUrl: './field-select.component.scss',
  templateUrl: './field-select.component.html',
})
export class FieldSelectComponent {
  clearable = input(false);

  control = input.required<FormControl<string>>();

  items = input.required<readonly SelectOption[]>();

  placeholder = input<string>('');

  showValidationErrors = input(false);

  searchable = input(true);

  blurred = output<void>();

  isControlRequiredError(): boolean {
    const control = this.control();
    return control.hasError('required') && this.#shouldShowValidationFeedback();
  }

  isNgSelectShowingValidationError(): boolean {
    const control = this.control();
    return control.invalid && this.#shouldShowValidationFeedback();
  }

  onBlur(): void {
    this.blurred.emit();
  }

  #shouldShowValidationFeedback(): boolean {
    return this.control().touched || this.showValidationErrors();
  }
}
