import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RemoteMarkdownService {
  readonly #http = inject(HttpClient);

  fetch(url: string): Observable<string> {
    return this.#http.get(url, { responseType: 'text' });
  }
}
