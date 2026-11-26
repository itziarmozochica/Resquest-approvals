import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { PlanGallery, PlanGalleryDTO } from '../../models/get-gallery';
import { PlanGalleryPatch, PlanGalleryPost } from '../../models/patch-gallery';

export type GetGalleryResponse = Pick<BaseResponse<PlanGalleryDTO>, 'data' | 'error'>;

/** Galleries served before PARTNERS-10455 carry neither key, so every consumer can read both unconditionally. */
export function toPlanGallery(dto: PlanGalleryDTO): PlanGallery {
  return {
    ...dto,
    gallery_layout: {
      desktop: dto.gallery_layout?.desktop ?? null,
      mobile: dto.gallery_layout?.mobile ?? null,
    },
    media: dto.media ?? [],
  };
}

@Injectable({
  providedIn: 'root',
})
export class PlanGalleryService {
  constructor(private httpClient: HttpClient) {}

  getGallery(partnerId: number, planId: number): Observable<BaseResponse<PlanGallery>> {
    const url = `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/gallery/`;
    return this.httpClient.get<GetGalleryResponse>(url).pipe(
      map(response => {
        return new BaseResponse<PlanGallery>(response.data ? toPlanGallery(response.data) : null, response.error);
      }),
    );
  }

  getGalleryOrNull(partnerId: number, planId: number): Observable<PlanGallery | null> {
    return this.getGallery(partnerId, planId).pipe(
      map(response => response.data),
      catchError((error: unknown) => (error instanceof HttpErrorResponse && error.status === 404 ? of(null) : throwError(() => error))),
    );
  }

  updateGallery(partnerId: number, planId: number, galleryId: number, gallery: PlanGalleryPatch): Observable<void> {
    const url = `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/gallery/${galleryId}/`;
    return this.httpClient.patch<void>(url, gallery);
  }

  createGallery(partnerId: number, planId: number, gallery: PlanGalleryPost): Observable<void> {
    const url = `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/gallery/add/`;
    return this.httpClient.post<void>(url, gallery);
  }
}
