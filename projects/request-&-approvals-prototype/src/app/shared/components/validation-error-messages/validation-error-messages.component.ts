import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-validation-error-messages',
  standalone: false,
  templateUrl: './validation-error-messages.component.html',
  styleUrls: ['./validation-error-messages.component.scss'],
})
export class ValidationErrorMessagesComponent {
  @Input() control!: AbstractControl;

  getControlError(control: AbstractControl): string | null {
    if (!control?.touched) {
      return null;
    }
    const errors = Object.getOwnPropertyNames(control.errors || {});
    return errors.length > 0 ? (errors.shift() ?? null) : null;
  }
}
