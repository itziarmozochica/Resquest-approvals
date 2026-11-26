import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { SlackChannelsAdapter } from './slack-channels.adapter';
import { SlackChannel, SlackChannelsApiData } from './slack-channels.model';

@Injectable({ providedIn: 'root' })
export class SlackChannelsService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(SlackChannelsAdapter);

  get(partnerId: number): Observable<BaseResponse<SlackChannel[] | null>> {
    return this.#http.get<BaseResponse<SlackChannelsApiData>>(this.#url(partnerId)).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<SlackChannel[]>(error)),
    );
  }

  #url(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/slack-channels/`;
  }
}
