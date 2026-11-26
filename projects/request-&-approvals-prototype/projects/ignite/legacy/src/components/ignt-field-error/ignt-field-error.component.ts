import { NgIf } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

import { IconsModule } from '@fz-original/app/shared/icons/icons.module';

@Component({
  selector: 'ignt-field-error',
  templateUrl: './ignt-field-error.component.html',
  exportAs: 'formErrors',
  standalone: true,
  styleUrls: ['./ignt-field-error.component.scss'],
  imports: [IconsModule, NgIf],
})
export class IgntFieldErrorComponent {
  get hasError(): boolean {
    const errors = this.formControlValue?.errors;
    return (errors && errors[this.errorName]) || this.showError;
  }
  @Input() errorName = '';
  @Input() formControlValue: AbstractControl | null = null;
  @Input() showError = false;
}
