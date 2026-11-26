import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { OnsiteSetup } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { PresetCoupons, PresetCouponsDTO } from '@fz-original/app/modules/box-office/shared/models/preset-coupon';
import { OnsiteSetupPresetCouponsAdapter } from '@fz-original/app/modules/box-office/shared/services/onsite-setups-preset-coupons/onsite-setup-preset-coupons.adapter';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';

import { OnsiteSetupsService } from '../onsite-setups/onsite-setups.service';

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupsPresetCouponsService {
  readonly #cache = new Map<string, Observable<PresetCoupons>>();
  #http = inject(HttpClient);
  #onsiteSetupPresetCouponsAdapter = inject(OnsiteSetupPresetCouponsAdapter);
  #onsiteSetupsService = inject(OnsiteSetupsService);
  #partnerService = inject(PartnerService);

  clearCache(onsiteSetupId?: string): void {
    if (onsiteSetupId) {
      this.#cache.delete(onsiteSetupId);
      return;
    }

    this.#cache.clear();
  }

  getPresetCouponsByOnsiteSetup(onsiteSetup: OnsiteSetup): Observable<PresetCoupons> {
    return this.#getPresetCoupons(onsiteSetup.id, () => of(onsiteSetup));
  }

  getPresetCouponsByOnsiteSetupId(onsiteSetupId: string): Observable<PresetCoupons> {
    return this.#getPresetCoupons(onsiteSetupId, () => this.#onsiteSetupsService.getOnsiteSetup(onsiteSetupId));
  }

  #getPresetCoupons(onsiteSetupId: string, resolveOnsiteSetup: () => Observable<OnsiteSetup>): Observable<PresetCoupons> {
    const cachedPresetCoupons$ = this.#cache.get(onsiteSetupId);
    if (cachedPresetCoupons$) {
      // A caller that joined an in-flight request refetches once if it fails: the failure already
      // evicted the entry, so this is a fresh request (shared with any other joiner's retry), not a replay.
      return cachedPresetCoupons$.pipe(
        catchError(() => this.#cache.get(onsiteSetupId) ?? this.#fetchPresetCoupons(onsiteSetupId, resolveOnsiteSetup)),
      );
    }

    return this.#fetchPresetCoupons(onsiteSetupId, resolveOnsiteSetup);
  }

  #fetchPresetCoupons(onsiteSetupId: string, resolveOnsiteSetup: () => Observable<OnsiteSetup>): Observable<PresetCoupons> {
    const presetCoupons$ = this.#http.get<BaseResponse<PresetCouponsDTO>>(this.#getOnsiteSetupPresetCouponsUrl(onsiteSetupId)).pipe(
      switchMap(templateCouponsResponse => {
        const presetTemplateCoupons = this.#onsiteSetupPresetCouponsAdapter.fromApi(templateCouponsResponse.data!);

        return resolveOnsiteSetup().pipe(map(onsiteSetup => this.#mergeCoupons(presetTemplateCoupons, onsiteSetup)));
      }),
      catchError(error => {
        if (this.#cache.get(onsiteSetupId) === presetCoupons$) {
          this.#cache.delete(onsiteSetupId);
        }
        return throwError(() => ErrorResponseUtils.getErrorResponseError(error));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.#cache.set(onsiteSetupId, presetCoupons$);

    return presetCoupons$;
  }

  #mergeCoupons(presetTemplateCoupons: PresetCoupons, onsiteSetup: OnsiteSetup): PresetCoupons {
    const allCustomCodes = onsiteSetup.preset_coupon_codes || [];
    const presetTemplateCouponCodes = presetTemplateCoupons.coupons.map(coupon => coupon.code);

    const customCoupons = allCustomCodes
      .filter(code => !presetTemplateCouponCodes.includes(code))
      .map(code => ({
        code,
        title: code,
      }));

    return {
      coupons: [...presetTemplateCoupons.coupons, ...customCoupons],
      lazyCoupons: presetTemplateCoupons.lazyCoupons,
    };
  }

  #getOnsiteSetupPresetCouponsUrl(onsiteSetupId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${this.#getPartnerId()}/onsite-setups/${onsiteSetupId}/preset-coupons`;
  }

  #getPartnerId(): number {
    return this.#partnerService.getPartner()?.id as number;
  }
}
