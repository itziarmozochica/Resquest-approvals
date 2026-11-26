import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { SKIP_FORBIDDEN_TOAST } from '../../../shared/interceptors/skip-forbidden-toast.token';
import { BaseResponse } from '../../../shared/models/base-response';
import { ErrorResponseUtils } from '../../../shared/utils/error-response.utils';
import { DistributorGroupPublication } from '../models/distributor-group-publication.model';
import { DistributorGroupPublicationsAdapter } from './adapters/distributor-group-publications.adapter';
import { DistributorGroupPublicationsDto } from './dtos/distributor-group-publication.dto';

@Injectable({
  providedIn: 'root',
})
export class RecentDistributorGroupPublicationsService {
  readonly #adapter = inject(DistributorGroupPublicationsAdapter);
  readonly #http = inject(HttpClient);

  getPartnerPublications(partnerId: number): Observable<BaseResponse<DistributorGroupPublication[] | null>> {
    const path = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/distributor-group-publications`;

    return this.#http
      .get<BaseResponse<DistributorGroupPublicationsDto>>(path, {
        context: new HttpContext().set(SKIP_FORBIDDEN_TOAST, true),
        observe: 'response',
      })
      .pipe(
        switchMap(result => of(this.#adapter.fromApi(result))),
        catchError(error => ErrorResponseUtils.getErrorResponse<DistributorGroupPublication[]>(error)),
      );
  }
}
