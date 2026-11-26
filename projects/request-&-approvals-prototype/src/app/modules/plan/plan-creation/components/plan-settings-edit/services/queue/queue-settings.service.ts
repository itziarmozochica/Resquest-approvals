import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { QueueOverviewAdapter } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/queue/queue-overview.adapter';
import {
  QueueOverview,
  QueueOverviewData,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/models/queue/queue-overview.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class QueueSettingsService {
  #http = inject(HttpClient);
  #queueOverviewAdapter = inject(QueueOverviewAdapter);

  getQueueOverview(partnerId: number, planId: number, channelId?: string | null): Observable<QueueOverview | null> {
    const params = channelId != null && channelId !== '' ? new HttpParams().set('channel_id', channelId) : new HttpParams();
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/queue-overview/`;
    return this.#http.get<BaseResponse<QueueOverviewData>>(url, { params }).pipe(
      map(response => this.#queueOverviewAdapter.fromApi(response)),
      catchError((error: unknown) => {
        if ((error as { status?: number })?.status === 404) {
          return of(null);
        }
        return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
      }),
    );
  }
}
