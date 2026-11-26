import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { ThemedUrlResponse } from '../../../branding/models/theme.model';

@Injectable({
  providedIn: 'root',
})
export class PlanThemedUrlService {
  #httpClient = inject(HttpClient);

  getThemedUrl(partnerId: number, planId: number): Observable<string | null> {
    if (!partnerId || !planId) {
      return of(null);
    }

    const path = this.#getThemedUrlPath(partnerId, planId);
    return this.#httpClient.get<ThemedUrlResponse>(path).pipe(
      map((response: ThemedUrlResponse) => response.url || null),
      catchError(() => of(null)),
    );
  }

  #getThemedUrlPath(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/theme/preview-url/?main_plan_id=${planId}`;
  }
}
