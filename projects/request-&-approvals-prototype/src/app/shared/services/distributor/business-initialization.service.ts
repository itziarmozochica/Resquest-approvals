import { inject, Injectable } from '@angular/core';

import { B2bIamAuthClient, isNotADistributorOrganization, type DistributorPartnerConfig } from '@fz/b2b-iam';
import { STORAGE_SERVICE } from '@fz/storage';
import * as Sentry from '@sentry/angular';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

import { StorageKey } from '../../../app/enums/storage.enum';
import { BaseResponse } from '../../models/base-response';
import type { Organization } from '../../models/organization/organization.model';
import { User } from '../../models/user/user.model';
import { BusinessAsOrganizationFlagService } from './business-as-organization-flag.service';
import { toFeverZoneBusiness } from './distributor-business.mapper';
import { DistributorSessionStore } from './distributor-session.store';

const distributorsCategory = 'distributors';

@Injectable()
export class BusinessInitializationService {
  readonly #client = inject(B2bIamAuthClient);
  readonly #businessAsOrganizationFlag = inject(BusinessAsOrganizationFlagService);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #store = inject(DistributorSessionStore);

  applies(): boolean {
    if (!this.#businessAsOrganizationFlag.isEnabled()) {
      return false;
    }

    return this.#storage.get<Organization>(StorageKey.selectedOrganization)?.category === distributorsCategory;
  }

  initializeOrFallBack(
    user: User,
    organizationId: number,
    fallback: () => Observable<BaseResponse<User | null>>,
  ): Observable<BaseResponse<User | null>> {
    this.#store.clear();

    return this.#refreshSelectedBusinessPartners(user.id, organizationId).pipe(
      switchMap(() => this.#initialize(user, organizationId, fallback)),
    );
  }

  #initialize(
    user: User,
    organizationId: number,
    fallback: () => Observable<BaseResponse<User | null>>,
  ): Observable<BaseResponse<User | null>> {
    if (!this.applies()) {
      return this.#notADistributor(fallback);
    }

    return this.#client.getDistributor(organizationId).pipe(
      switchMap(response => {
        if (isNotADistributorOrganization(response)) {
          return this.#notADistributor(fallback);
        }
        if (response.error !== null || response.data === null) {
          Sentry.captureMessage('Distributor fetch failed, session degraded to the user-scoped path', {
            extra: { code: response.error?.code, message: response.error?.message, organizationId },
            level: 'warning',
            tags: { feature: 'business_as_organization' },
          });

          return this.#notADistributor(fallback);
        }

        const distributor = response.data;
        this.#store.setPartnerConfigs(this.#pilotPartnerConfigs(distributor.partnerConfigs), organizationId);
        user.business = toFeverZoneBusiness(distributor.business);

        return of(new BaseResponse(user, null));
      }),
    );
  }

  #pilotPartnerConfigs(partnerConfigs: readonly DistributorPartnerConfig[]): readonly DistributorPartnerConfig[] {
    if (this.#businessAsOrganizationFlag.isEnabledGlobally()) {
      return partnerConfigs;
    }

    return partnerConfigs.filter(config =>
      this.#businessAsOrganizationFlag.isPilotPartnerOfSelectedOrganization(config.partnerOrganizationId),
    );
  }

  // The pilot partners are stored with the selection, so a change to b2b-iam's pilot or exclusion lists would wait for the next pick.
  #refreshSelectedBusinessPartners(userId: number, organizationId: number): Observable<void> {
    const selectedOrganization = this.#storage.get<Organization>(StorageKey.selectedOrganization);
    if (selectedOrganization?.category !== distributorsCategory || selectedOrganization.id !== organizationId) {
      return of(undefined);
    }

    return this.#client.organizations(userId, { includeBookingAgents: true, organizationCategory: distributorsCategory }).pipe(
      map(response => {
        if (response.error !== null || response.data === null) {
          return;
        }
        const refreshed = response.data.find(organization => organization.id === organizationId);
        this.#storage.set(StorageKey.selectedOrganization, {
          ...selectedOrganization,
          partnerOrganizationIds: refreshed?.partnerOrganizationIds ?? [],
        });
      }),
      catchError(() => of(undefined)),
    );
  }

  /**
   * Every fallback lands here, the degraded one included: the app has *decided* to run this session
   * user-scoped, so anything gating on the session must see a settled answer rather than wait for one
   * that is never coming.
   */
  #notADistributor(fallback: () => Observable<BaseResponse<User | null>>): Observable<BaseResponse<User | null>> {
    this.#store.markNotADistributor();

    return fallback();
  }
}
