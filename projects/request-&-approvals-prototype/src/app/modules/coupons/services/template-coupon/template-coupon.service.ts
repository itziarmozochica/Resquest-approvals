import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { BaseResponse } from '../../../../shared/models/base-response';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { TemplateCouponDetail } from '../../models/template-coupon/template-coupon-detail.model';
import { TemplateCouponPatch } from '../../models/template-coupon/template-coupon-patch.model';
import { TemplateCouponDetailAdapter } from './template-coupon-detail.adapter';
import { TemplateCouponDetailDTO } from './template-coupon-detail.dto';
import { TemplateCouponAdapter, TemplateCouponsListResponse } from './template-coupon.adapter';
import { TemplateCouponDTO } from './template-coupon.dto';
import { TemplateCouponsQueryParams } from './template-coupons-query-params';

@Injectable({
  providedIn: 'root',
})
export class TemplateCouponService {
  private readonly URLS = {
    getTemplateCoupons: (partnerId: number): string => `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/template-coupons`,
    getTemplateCoupon: (partnerId: number, templateCouponId: number): string =>
      `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/template-coupons/${templateCouponId}`,
    createTemplateCoupon: (partnerId: number): string => `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/template-coupons/add`,
    patchTemplateCoupon: (partnerId: number, templateCouponId: number): string =>
      `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/template-coupons/${templateCouponId}/update`,
  };

  private readonly defaultParameters = { page: 1, pageSize: 50 };

  constructor(
    private partnerService: PartnerService,
    private httpClient: HttpClient,
    private templateCouponAdapter: TemplateCouponAdapter,
    private templateCouponDetailAdapter: TemplateCouponDetailAdapter,
  ) {}

  getTemplateCoupons(parameters?: TemplateCouponsQueryParams): Observable<TemplateCouponsListResponse> {
    const partnerId = this.partnerService.getPartner()!.id;

    return this.httpClient
      .get<BaseResponse<Array<TemplateCouponDTO>>>(this.URLS.getTemplateCoupons(partnerId), {
        observe: 'response',
        params: this.getTemplateCouponsHttpParams(parameters || this.defaultParameters),
      })
      .pipe(
        map(response => this.templateCouponAdapter.fromApi(response)),
        catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  getTemplateCouponDetail(templateCouponId: number): Observable<TemplateCouponDetail> {
    const partnerId = this.partnerService.getPartner()!.id;

    return this.httpClient.get<BaseResponse<TemplateCouponDetailDTO>>(this.URLS.getTemplateCoupon(partnerId, templateCouponId)).pipe(
      map(response => {
        if (response.error) {
          throwError(ErrorResponseUtils.getErrorResponseError(response));
        }
        return { id: templateCouponId, ...this.templateCouponDetailAdapter.fromApi(response) };
      }),
      catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  createTemplateCouponDetail(templateCouponDetail: Partial<TemplateCouponDetail>): Observable<void> {
    const partnerId = this.partnerService.getPartner()!.id;

    return this.httpClient
      .post<void>(this.URLS.createTemplateCoupon(partnerId), this.templateCouponDetailAdapter.toCreateApi(templateCouponDetail))
      .pipe(catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))));
  }

  patchTemplateCoupon(templateCouponId: number, templateCouponPatch: Partial<TemplateCouponPatch>): Observable<void> {
    const partnerId = this.partnerService.getPartner()!.id;

    return this.httpClient
      .patch<void>(
        this.URLS.patchTemplateCoupon(partnerId, templateCouponId),
        this.templateCouponDetailAdapter.toPatchApi(templateCouponPatch),
      )
      .pipe(catchError(error => throwError(ErrorResponseUtils.getErrorResponseError(error))));
  }

  private getTemplateCouponsHttpParams(queryParams: TemplateCouponsQueryParams): HttpParams {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('page', queryParams.page);
    httpParams = httpParams.append('items_per_page', queryParams.pageSize);

    if (queryParams.search && queryParams.search.length > 0) {
      httpParams = httpParams.append('search_filter', queryParams.search);
    }

    if (queryParams.status && queryParams.status.length > 0) {
      httpParams = httpParams.append('status_filters', queryParams.status);
    }

    if (queryParams.validity && queryParams.validity.length > 0) {
      httpParams = httpParams.append('validity_period_filters', queryParams.validity);
    }

    if (queryParams.templateCouponType && queryParams.templateCouponType.length > 0) {
      httpParams = httpParams.append('template_coupon_type', queryParams.templateCouponType);
    }

    return httpParams;
  }
}
