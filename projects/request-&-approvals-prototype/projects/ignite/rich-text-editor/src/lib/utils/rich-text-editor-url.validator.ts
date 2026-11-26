import type { AbstractControl, ValidationErrors } from '@angular/forms';

import { isValidLinkUrl } from './validate-link-url.util';

export function igntRichTextEditorUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim() ?? '';

  return isValidLinkUrl(value) ? null : { invalidUrl: true };
}
