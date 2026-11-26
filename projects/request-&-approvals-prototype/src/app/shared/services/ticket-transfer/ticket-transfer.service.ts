import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { PartnerService } from '../partner/partner.service';

@Injectable({
  providedIn: 'root',
})
export class TicketTransferService {
  #httpClient = inject(HttpClient);
  #partnerService = inject(PartnerService);

  resendEmail(transferIntentId: number): Observable<void> {
    const partnerId = this.#partnerService.getPartner()!.id;
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/transfer-intents/${transferIntentId}/resend-transfer-email/`;
    return this.#httpClient.post<void>(url, {});
  }

  revoke(transferIntentId: number): Observable<void> {
    const partnerId = this.#partnerService.getPartner()!.id;
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/transfer-intents/${transferIntentId}/revoke/`;
    return this.#httpClient.put<void>(url, {});
  }
}
