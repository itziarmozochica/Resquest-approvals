import { inject, Injectable } from '@angular/core';

import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { Business } from '../../../settings/shared/models/business.model';
import { BusinessPaymentSettingsService } from '../../../settings/shared/services/business-payment-settings.service';
import { BusinessService } from '../../../settings/shared/services/business.service';
import { PROFORMA_INVOICE_SEARCH_PAGE_SIZE } from '../models/proforma-invoice-dialog.model';
import { businessTaxIdContains, isTaxIdSearch, mergeBusinesses } from '../utils/proforma-invoice-business.util';

@Injectable({
  providedIn: 'root',
})
export class ProformaInvoiceBusinessService {
  readonly #businessService = inject(BusinessService);
  readonly #paymentSettingsService = inject(BusinessPaymentSettingsService);
  readonly #partnerService = inject(PartnerService);

  get(businessId: string): Observable<Business | null> {
    const organizationId = this.#partnerService.getPartner()?.id;
    if (organizationId === undefined) {
      return of(null);
    }

    return this.#businessService.getBusiness({ businessId, organizationId }).pipe(
      map(response => response.data ?? null),
      catchError(() => of(null)),
    );
  }

  paymentInstructions(business: Business): Observable<string> {
    const distributorOrganizationId = business.organizationId ?? null;
    if (distributorOrganizationId === null) {
      return of('');
    }

    return this.#paymentSettingsService.getDistributorPaymentSettings({ distributorOrganizationId }).pipe(
      map(response => response.data?.paymentInstructions ?? ''),
      catchError(() => of('')),
    );
  }

  search(term: string): Observable<Business[]> {
    const trimmedTerm = term.trim();
    if (!isTaxIdSearch(trimmedTerm)) {
      return this.#list(trimmedTerm);
    }

    return forkJoin([this.#list(trimmedTerm), this.#list('')]).pipe(
      map(([byNameOrEmail, firstPage]) =>
        mergeBusinesses(
          byNameOrEmail,
          firstPage.filter(business => businessTaxIdContains(business, trimmedTerm)),
        ),
      ),
    );
  }

  #list(search: string): Observable<Business[]> {
    const organizationId = this.#partnerService.getPartner()?.id;
    if (organizationId === undefined) {
      return of([]);
    }

    return this.#businessService.getBusinesses({ itemsPerPage: PROFORMA_INVOICE_SEARCH_PAGE_SIZE, organizationId, page: 1, search }).pipe(
      map(response => response.data?.businesses ?? []),
      catchError(() => of([])),
    );
  }
}
