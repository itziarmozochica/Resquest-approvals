import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import {
  DistributorRouteService,
  scopedOrganizationHeaderFor,
} from '@fz-original/app/shared/services/distributor/distributor-route.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { catchError, map, Observable, throwError } from 'rxjs';

import { ValidationCashReceiptServiceCreateBody } from '../../models/validation-cash-receipt.model';

@Injectable({
  providedIn: 'root',
})
export class CashReceiptService {
  readonly #distributorRoute = inject(DistributorRouteService);
  #http = inject(HttpClient);
  #optimizeyService = inject(OptimizelyService);
  #partnerService = inject(PartnerService);

  createCashReceipt(orderId: number, body: ValidationCashReceiptServiceCreateBody, orderPartnerId?: number): Observable<undefined> {
    const distributorId = this.#distributorRoute.actingDistributorId();
    const scopedPartnerId = orderPartnerId ?? this.#distributorRoute.pairTarget()?.targetOrganizationId;
    if (distributorId !== null && scopedPartnerId === undefined) {
      return throwError(() => new Error('No partner chosen for the acting distributor'));
    }

    let url: string;
    if (distributorId !== null) {
      url = this.#getScopedCreateCashReceiptUrl(scopedPartnerId as number, orderId);
    } else {
      const partner: Partner | null = this.#partnerService.getPartner();
      if (partner === null) {
        throw new Error('Partner not found');
      }
      url = this.#getCreateCashReceiptUrl(partner.id, orderId);
    }
    const headers = new HttpHeaders(distributorId !== null ? scopedOrganizationHeaderFor(distributorId) : {});
    return this.#http
      .post<undefined>(
        url,
        {
          email: body.email,
          identity_num: body.businessNumber,
          total_amount: body.totalAmount,
          trade_usage: '지출증빙용',
          franchise_corp_num: environment.cashReceipt.franchise_corp_num,
          user_id: environment.cashReceipt.user_id,
        },
        { headers },
      )
      .pipe(
        map((): undefined => undefined),
        catchError((error: unknown) => throwError(() => ({ data: null, error: ErrorResponseUtils.getErrorResponseError(error) }))),
      );
  }

  isAvailable(planId: number): boolean {
    const partner: Partner | null = this.#partnerService.getPartner();
    if (partner === null) {
      throw new Error('Partner not found');
    }
    return this.#optimizeyService.isFeatureEnabled('show_cash_receipt', { plan_id: planId }) ?? false;
  }

  #getCreateCashReceiptUrl(partnerId: number, orderId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/orders/${orderId}/cash-receipts`;
  }

  #getScopedCreateCashReceiptUrl(partnerId: number, orderId: number): string {
    return `${environment.apiGWBaseUrl}/2.0/partners/${partnerId}/orders/${orderId}/cash-receipts`;
  }
}
