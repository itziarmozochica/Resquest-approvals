import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { TranslationLanguage, TranslationLanguageDTO, TranslationLanguagesResponseDTO } from '../../models/translation-language.model';

@Injectable({
  providedIn: 'root',
})
export class TranslationLanguagesService {
  #http = inject(HttpClient);

  getTranslationLanguages(partnerId: number): Observable<BaseResponse<TranslationLanguage[]>> {
    const url = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/translation-languages`;

    return this.#http.get<TranslationLanguagesResponseDTO | TranslationLanguageDTO[]>(url).pipe(
      map((response: TranslationLanguagesResponseDTO | TranslationLanguageDTO[]) => {
        if (!Array.isArray(response) && response?.error) {
          return new BaseResponse<TranslationLanguage[]>(null, response.error);
        }

        const dataArray: TranslationLanguageDTO[] = Array.isArray(response) ? response : (response?.data ?? []);

        if (!Array.isArray(dataArray)) {
          return new BaseResponse<TranslationLanguage[]>([], null);
        }

        const languages: TranslationLanguage[] = dataArray
          .map((dto: TranslationLanguageDTO) => ({
            code: dto.code,
            locale: dto.locale,
            name: dto.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

        return new BaseResponse<TranslationLanguage[]>(languages, null);
      }),
    );
  }
}
