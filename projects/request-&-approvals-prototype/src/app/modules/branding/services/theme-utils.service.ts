import { Injectable } from '@angular/core';

import { Theme } from '../models/theme.model';

@Injectable({
  providedIn: 'root',
})
export class ThemeUtilsService {
  encodeThemeData(theme: Theme): string {
    const themeData = this.#mapThemeToPreviewFormat(theme);
    return btoa(JSON.stringify(themeData));
  }

  #mapThemeToPreviewFormat(theme: Theme): {
    backgroundColor: string;
    baseColor: string;
    bodyFontColor: string;
    contrastBaseColor: string;
    contrastPrimaryColor: string;
    primaryColor: string;
  } {
    return {
      backgroundColor: theme.backgroundColor,
      baseColor: theme.headerColor,
      bodyFontColor: theme.mainTextColor,
      contrastBaseColor: theme.buttonTextColor,
      contrastPrimaryColor: theme.titleColor,
      primaryColor: theme.buttonColor,
    };
  }
}
