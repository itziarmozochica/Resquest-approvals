import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';

interface UploadContentFileResponseDTO {
  data: { url: string } | null;
  error: { code: number; message: string } | null;
}

@Injectable({
  providedIn: 'root',
})
export class ContentFileUploadService {
  readonly #httpClient = inject(HttpClient);

  upload(
    partnerId: number,
    planId: number,
    file: File,
    language: string | null = null,
    channelId: string | null = null,
  ): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    if (language !== null) {
      formData.append('language', language);
    }
    if (channelId !== null && channelId !== '') {
      formData.append('channel_id', channelId);
    }

    const url = this.#getUploadUrl(partnerId, planId);
    return this.#httpClient.post<UploadContentFileResponseDTO>(url, formData).pipe(
      map(response => {
        if (response.data === null) {
          throw new Error(response.error?.message ?? 'Upload failed');
        }
        return response.data.url;
      }),
    );
  }

  #getUploadUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId.toString()}/plans/${planId.toString()}/content-files/`;
  }
}
