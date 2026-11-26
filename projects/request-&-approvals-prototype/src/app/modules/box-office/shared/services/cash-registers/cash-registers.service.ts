import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../../environments/environment';
import { BaseResponse } from '../../../../../shared/models/base-response';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../../shared/utils/error-response.utils';
import { CashRegister } from '../../models/cash-register';
import { CreateCashRegisterResponseDTO } from '../../models/create-cash-register-response';
import { CashRegistersAdapter } from './cash-registers.adapter';

export type GetCashRegistersApiResponseBody = Pick<BaseResponse<Array<CashRegister>>, 'data' | 'error'>;

@Injectable({
  providedIn: 'root',
})
export class CashRegistersService {
  constructor(
    private http: HttpClient,
    private partnerService: PartnerService,
    private cashRegistersAdapter: CashRegistersAdapter,
  ) {}

  getCashRegisters(onsiteSetupId?: string, placeId?: number): Observable<Array<CashRegister>> {
    const params: HttpParams = this.getParameters(onsiteSetupId, placeId);
    return this.http.get<GetCashRegistersApiResponseBody>(this.getCashRegistersUrl(), { params: params }).pipe(
      map(response => this.cashRegistersAdapter.fromApi(response.data ?? [])),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  private getParameters(onsiteSetupId?: string, placeId?: number): HttpParams {
    let params = new HttpParams();
    if (onsiteSetupId) {
      params = params.set('onsite_setup_id', onsiteSetupId);
    }
    if (placeId) {
      params = params.set('place_id', placeId);
    }
    return params;
  }

  private getCashRegistersUrl(): string {
    const partnerId = this.partnerService.getPartner()?.id;
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/cash-registers`;
  }

  createCashRegister(placeId: number, cashRegisterName: string): Observable<string> {
    const body = { name: cashRegisterName };
    return this.http.post<BaseResponse<CreateCashRegisterResponseDTO>>(this.getCashRegisterUrlByPlace(placeId), body).pipe(
      map((response: BaseResponse<CreateCashRegisterResponseDTO>) => response.data!.cash_register_id),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  updateCashRegister(placeId: number, cashRegisterId: string, cashRegisterName: string): Observable<any> {
    const body = { name: cashRegisterName };
    return this.http.put(this.getCashRegisterUrlByPlace(placeId, cashRegisterId), body).pipe(
      map(response => response),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  deleteCashRegister(placeId: number, cashRegisterId: string): Observable<any> {
    return this.http.delete(this.getCashRegisterUrlByPlace(placeId, cashRegisterId)).pipe(
      map(response => response),
      catchError(err => throwError(ErrorResponseUtils.getErrorResponseError(err))),
    );
  }

  private getCashRegisterUrlByPlace(placeId: number, cashRegisterId?: string): string {
    const partnerId = this.partnerService.getPartner()?.id;
    return (
      `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/places/${placeId}/cash-registers` +
      (cashRegisterId ? `/${cashRegisterId}` : '')
    );
  }
}
