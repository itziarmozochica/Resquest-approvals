import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';

import { QuickSetupInventoryPayload } from '../models/quick-setup-inventory.model';
import { QuickSetupWriteOriginService } from './quick-setup-write-origin.service';

@Injectable({
  providedIn: 'root',
})
export class CreateEventQuickSetupInventoryService {
  readonly #httpClient = inject(HttpClient);
  readonly #writeOriginService = inject(QuickSetupWriteOriginService);

  createInventory(partnerId: number, planId: number, payload: QuickSetupInventoryPayload): Observable<void> {
    const url = this.#getCreateInventoryUrl(partnerId, planId);

    return this.#httpClient.post<void>(url, payload, { context: this.#writeOriginService.context() });
  }

  upsertInventory(partnerId: number, planId: number, payload: QuickSetupInventoryPayload): Observable<void> {
    const url = this.#getCreateInventoryUrl(partnerId, planId);

    return this.#httpClient.put<void>(url, payload, { context: this.#writeOriginService.context() });
  }

  #getCreateInventoryUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/inventory/`;
  }
}
