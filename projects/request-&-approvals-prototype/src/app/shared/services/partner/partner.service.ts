import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';

import { RoutePrimaryPath } from '@fz-original/app/app/enums/route.enum';
import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { OSSConfigStorageService } from '@fz-original/app/modules/box-office/one-stop-shop/services/oss-config-storage.service';
import { BehaviorSubject, fromEvent, Observable, of, Subscription } from 'rxjs';
import { catchError, filter, map, take } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { OnsiteSetupsStorageService } from '../../../modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentConfigStorageService } from '../../../modules/box-office/shared/services/payment/payment-config-storage.service';
import { UserShiftStorageService } from '../../../modules/box-office/ticketing/services/user-shift/user-shift-storage.service';
import { BaseResponse } from '../../models/base-response';
import { OrganizationTypeEnum } from '../../models/partner/organization-type.enum';
import { Partner, PartnerData } from '../../models/partner/partner.model';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { isDefaultTarget, LandingTargetService } from '../landing-target/landing-target.service';
import { PartnerAdapter } from './partner.adapter';

export const CAPN_ID = 12759;
export const CIRQUE_DU_SOLEIL_PARTNER_ID = 3723;
export const CIRQUE_DU_SOLEIL_PLAN_ID = 572769;
export const PARADOX_MUSEUM_INDIA = 14703;
export const MUSEUM_OF_ILLUSIONS_NEW_DELHI = 38364;
export const CATEDRAL_SEGOVIA = 26355;
export const CAIXA_FORUM_PARTNER_ID = 10536;
export const SENSAS_PARTNER_ID = 26112;
export const SENSAS_BARCELONA_PARTNER_ID = 10395;
export const SENSAS_LONDON_PARTNER_ID = 28693;
export const SO_TEST_ID = 8874;
export const LIV_GOLF_ID = 38131;
export const LIV_GOLF_NON_USA_ID = 43783;
export const PERNOD_RICARD_TEST = 140133;
export const PERNOD_RICARD = 50936;
export const JR_EAST = 43502;
export const REAL_MADRID_PARTNER_ID = 3696;
export const PIC_NIC_PARTNER_ID = 14465;
export const BANCO_DE_MEXICO_PARTNER_ID = 46615;
export const MERLIN_PARTNER_ID = 143666;
export const MERLIN_US_PARTNER_ID = 168334;
export const MERLIN_DEMO_PARTNER_ID = 153738;

export function isCirqueDuSoleil(partnerId: number | undefined | null, planId?: number): boolean {
  return partnerId === CIRQUE_DU_SOLEIL_PARTNER_ID || planId === CIRQUE_DU_SOLEIL_PLAN_ID;
}

export function isLivGolfPartner(partnerId: number | undefined | null): boolean {
  return partnerId === LIV_GOLF_ID || partnerId === LIV_GOLF_NON_USA_ID;
}

export function isMerlinPartner(partnerId: number | undefined | null): boolean {
  return partnerId === MERLIN_PARTNER_ID || partnerId === MERLIN_DEMO_PARTNER_ID || partnerId === MERLIN_US_PARTNER_ID;
}

export function isPernodRicardPartner(partnerId: number | undefined | null): boolean {
  return partnerId === PERNOD_RICARD_TEST || partnerId === PERNOD_RICARD;
}

@Injectable({
  providedIn: 'root',
})
export class PartnerService {
  static readonly partnerStorageKey: string = StorageKey.partner;
  #datadogLogService = inject(DatadogLogService);
  #httpClient = inject(HttpClient);
  readonly #injector = inject(Injector);
  #landingSubscription: Subscription | null = null;
  #ngZone = inject(NgZone);
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #ossConfigStorageService = inject(OSSConfigStorageService);
  #partner: Partner | null = null;
  #partnerAdapter = inject(PartnerAdapter);
  #partnerInfo = new BehaviorSubject<Partner | null>(this.getPartner());
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  #router = inject(Router);
  #userShiftStorageService = inject(UserShiftStorageService);

  constructor() {
    this.#redirectToLoginOnLogoutInAnotherTab();
  }

  clearPartner(): void {
    this.#safeStorageWrite(() => localStorage.removeItem(PartnerService.partnerStorageKey));
    this.#partner = null;
    this.#partnerInfo.next(null);
  }

  get(partnerId: number): Observable<BaseResponse<Partner | null>> {
    const path = this.#getPartnerUrl(partnerId);
    return this.#httpClient.get<BaseResponse<PartnerData>>(path).pipe(
      map((result: BaseResponse<PartnerData>) => this.#partnerAdapter.fromApi(result)),
      catchError(error => {
        return ErrorResponseUtils.getErrorResponse<Partner>(error);
      }),
    );
  }

  /**
   * Id of the organization the user is currently acting as, partner or distributor alike.
   *
   * Not `getPartner()?.id`: that returns `null` unless `name`, `countryCode` and `email` are all
   * present, a requirement a caller needing only the id has no reason to inherit.
   */
  getActingOrganizationId(): number | null {
    if (this.#partner) {
      return this.#partner.id ?? null;
    }

    const partnerData = this.#readPartnerFromStorage();

    if (partnerData === null) {
      return null;
    }

    try {
      const { id } = JSON.parse(partnerData) as Partial<Partner>;
      return typeof id === 'number' ? id : null;
    } catch {
      return null;
    }
  }

  getPartner(): Partner | null {
    if (this.#partner) {
      return this.#partner;
    }

    const partnerData = this.#readPartnerFromStorage();

    if (partnerData === null) {
      return null;
    }

    try {
      const partner = JSON.parse(partnerData) as Partner;
      if (!partner || !partner.id || !partner.name || !partner.countryCode || !partner.email) {
        return null;
      }
      this.#partner = partner;
      return this.#partner;
    } catch (e) {
      this.#datadogLogService.logError('Error while parsing partner data', e as { [key: string]: unknown });
      return null;
    }
  }

  isPartner(type?: OrganizationTypeEnum): boolean {
    if (!type) {
      return this.#partner?.type === OrganizationTypeEnum.PARTNER;
    }

    return type === OrganizationTypeEnum.PARTNER;
  }

  isReseller(type: OrganizationTypeEnum): boolean {
    return type === OrganizationTypeEnum.RESELLER;
  }

  observePartner(): Observable<Partner | null> {
    return this.partner$().pipe(filter(partner => !!partner));
  }

  observePartnerRemoved(): Observable<Partner | null> {
    return this.partner$().pipe(
      filter(partner => !partner),
      take(1),
    );
  }

  partner$(): Observable<Partner | null> {
    return this.#partnerInfo.asObservable();
  }

  savePartner(partner: Partner): void {
    this.#safeStorageWrite(() => localStorage.setItem(PartnerService.partnerStorageKey, JSON.stringify(partner)));
    this.#partner = partner;
    this.#partnerInfo.next(partner);
  }

  select(partner: Partner, navigateUrl?: string): void {
    this.savePartner(partner);
    if (this.#shouldRemoveOnsiteSetup(partner)) {
      this.#onsiteSetupsStorageService.removeConfiguration();
      this.#ossConfigStorageService.removeConfiguration();
      this.#paymentConfigStorageService.removeConfiguration();
    }
    this.#userShiftStorageService.removeOpenedShift();
    if (!navigateUrl) {
      return;
    }

    const target$ = isDefaultTarget(navigateUrl)
      ? this.#injector.get(LandingTargetService).resolve(partner.id, navigateUrl)
      : of(navigateUrl);
    this.#landingSubscription?.unsubscribe();
    this.#landingSubscription = target$.subscribe(targetUrl => {
      this.#ngZone.run(() => {
        this.#router.navigateByUrl(targetUrl);
      });
    });
  }

  #getPartnerUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/`;
  }

  #listenPartnerStorageChanges(): Observable<Partner> {
    return fromEvent<StorageEvent>(window, 'storage').pipe(
      filter((event: StorageEvent) => event.key === PartnerService.partnerStorageKey),
      map(e => (e.newValue ? JSON.parse(e.newValue) : null)),
    );
  }

  #readPartnerFromStorage(): string | null {
    try {
      return localStorage.getItem(PartnerService.partnerStorageKey);
    } catch {
      return null;
    }
  }

  #redirectToLoginOnLogoutInAnotherTab() {
    this.#listenPartnerStorageChanges().subscribe(partner => {
      if (this.#router.url !== `/${RoutePrimaryPath[RoutePrimaryPath['obo-second-screen']]}`) {
        this.#router.navigateByUrl(partner ? '/plans' : '/').finally(() => {
          window.location.reload();
        });
      }
    });
  }

  #safeStorageWrite(operation: () => void): void {
    try {
      operation();
    } catch {
      /* empty */
    }
  }

  #shouldRemoveOnsiteSetup(partner: Partner): boolean {
    return this.#onsiteSetupsStorageService.getConfiguration()?.partner_id != partner.id;
  }
}
