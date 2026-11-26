import { Pipe, PipeTransform } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

@Pipe({
  name: 'cityTranslate',
})
export class CityTranslatePipe extends TranslatePipe implements PipeTransform {
  private translationPrefix = 'cities.';
  transform(value: string): string {
    const translatedText = super.transform(this.translationPrefix + value);
    return translatedText.includes(this.translationPrefix) ? value : translatedText;
  }
}
