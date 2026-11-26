import { computed, inject, Injectable, Injector, Signal, signal } from '@angular/core';

import { BusinessSummary } from '@fz-original/app/modules/settings/shared/models/business-summary.model';
import { Business } from '@fz-original/app/modules/settings/shared/models/business.model';
import { BusinessService } from '@fz-original/app/modules/settings/shared/services/business.service';
import { LinkPaginationResponse } from '@fz-original/app/shared/models/link-pagination-response';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { User } from '@fz-original/app/shared/models/user/user.model';
import { OnBehalfScopeStore } from '@fz-original/app/shared/services/distributor/on-behalf-scope.store';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { map, Observable, of, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReservationBusinessChooseStateService {
  #injector = inject(Injector);
  #onBehalfScope = inject(OnBehalfScopeStore);
  #businessUser = signal<User | null>(null);
  #partner = signal<Partner | null>(null);
  #partnerService = inject(PartnerService);

  businesses = signal<Business[]>([]);
  hasBusinesses = signal<boolean>(false);
  hasMoreBusinesses = signal<boolean>(false);
  loadedBusinessesPage = signal<number>(0);

  getBusinessById(businessId: string | undefined): Signal<Business | null> {
    return computed(() => this.businesses().find(business => business.id === businessId) ?? null);
  }

  getBusinesses$(search?: string, page = 1): Observable<Business[]> {
    const organizationId: number | undefined = this.#partnerService.getPartner()?.id;
    if (organizationId !== undefined) {
      return this.#injector
        .get(BusinessService)
        .getBusinesses({
          itemsPerPage: 100,
          organizationId,
          page,
          search: search ?? '',
        })
        .pipe(
          map((response: LinkPaginationResponse<BusinessSummary | null>): Business[] => {
            if (response.error !== null) {
              if (page === 1) {
                // The loaded list belongs to the previous search, so its paging must not carry over:
                // the next scroll asks for page 1 of this search again, which replaces the list.
                this.hasMoreBusinesses.set(true);
                this.loadedBusinessesPage.set(0);
              }
              return [];
            }
            const list = response.data?.businesses ?? [];
            if (page === 1) {
              this.businesses.set(list);
            } else {
              this.businesses.update(current => {
                const loadedIds = new Set(current.map(business => business.id));
                return [...current, ...list.filter(business => !loadedIds.has(business.id))];
              });
            }
            this.hasMoreBusinesses.set(response.getNextPaginationPage() !== null);
            this.loadedBusinessesPage.set(page);
            return list;
          }),
        );
    } else {
      return of([]);
    }
  }

  getBusinessUser(): Signal<User | null> {
    return computed(() => this.#businessUser());
  }

  getPartner(): Signal<Partner | null> {
    return computed(() => this.#partner());
  }

  initBusinesses$(): Observable<null> {
    return this.getBusinesses$().pipe(
      take(1),
      map((businesses: Business[]): null => {
        this.hasBusinesses.set(businesses.length > 0);
        return null;
      }),
    );
  }

  reset(): void {
    this.#onBehalfScope.clear();
    this.#businessUser.set(null);
    this.#partner.set(null);
    this.businesses.set([]);
    this.hasBusinesses.set(false);
    this.hasMoreBusinesses.set(false);
    this.loadedBusinessesPage.set(0);
  }

  setBusinessUser(businessUser: User | null): void {
    this.#businessUser.set(businessUser);
  }

  setPartner(partner: Partner): void {
    this.#partner.set(partner);
  }
}
