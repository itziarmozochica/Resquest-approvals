import { inject, Pipe, PipeTransform } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

import { SanitizeService } from '@fz-original/app/app/services/sanitize/sanitize.service';

@Pipe({
  name: 'sanitize',
  standalone: true,
})
export class SanitizePipe implements PipeTransform {
  #sanitizeService: SanitizeService = inject(SanitizeService);

  transform(value: string): SafeHtml | null {
    return this.#sanitizeService.sanitizeToSafeHtml(value);
  }
}
