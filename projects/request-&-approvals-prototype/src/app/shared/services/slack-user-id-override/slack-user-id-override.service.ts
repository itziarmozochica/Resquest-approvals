import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { SaveSlackUserIdOverrideBody, SlackUserIdOverrideData } from './slack-user-id-override.model';

@Injectable({ providedIn: 'root' })
export class SlackUserIdOverrideService {
  readonly #http = inject(HttpClient);

  save(email: string, slackMemberId: string, partnerId: number): Observable<BaseResponse<SlackUserIdOverrideData | null>> {
    const body: SaveSlackUserIdOverrideBody = { email, slack_member_id: slackMemberId };
    return this.#http
      .put<BaseResponse<SlackUserIdOverrideData>>(this.#url(partnerId), body)
      .pipe(catchError(error => ErrorResponseUtils.getErrorResponse<SlackUserIdOverrideData>(error)));
  }

  #url(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/slack-user-ids/`;
  }
}
