import type { AbstractControl, ValidationErrors } from '@angular/forms';

export function requiredRichText(control: AbstractControl): ValidationErrors | null {
  const text = `${control.value ?? ''}`
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

  return text.length > 0 ? null : { required: true };
}
