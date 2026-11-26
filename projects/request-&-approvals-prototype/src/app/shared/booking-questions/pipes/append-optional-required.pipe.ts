import { inject, Pipe, PipeTransform } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'appendOptionalRequired',
  standalone: false,
})
export class AppendOptionalRequiredPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);
  private readonly REQUIRED_LABEL = '*';
  private readonly OPTIONAL_LABEL = `(${this.translate.instant('bookingQuestionsForm.optional')})`;
  transform(text: string, isOptional: boolean): string {
    const appendText = isOptional ? `<span class="form__label--optional">${this.OPTIONAL_LABEL.toLowerCase()}</span>` : this.REQUIRED_LABEL;
    return `${text} ${appendText}`;
  }
}
