import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PlanPreviewLink, PlanPreviewLinksApiData } from '@fz-original/app/shared/models/plan/plan-preview-links.model';
import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PlanPreviewLinksService {
  #http = inject(HttpClient);

  getPreviewLinks(partnerId: number, planId: number): Observable<PlanPreviewLink[]> {
    return this.#http.get<BaseResponse<PlanPreviewLinksApiData>>(this.#buildUrl(partnerId, planId)).pipe(
      map(response => response.data?.preview_links ?? []),
      catchError(() => of([])),
    );
  }

  #buildUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/preview-links/`;
  }
}
