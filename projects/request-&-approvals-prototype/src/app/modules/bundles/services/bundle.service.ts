import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal, WritableSignal } from '@angular/core';

import {
  BundleConfigurationResponse,
  BundleConfigurationResponseData,
  BundleResponseData,
  BundleSessionTypeDiscountConfigurationResponseData,
} from '@fz-original/app/modules/bundles/models/bundle-configuration-response-data.model';
import {
  Bundle,
  BundleConfiguration,
  BundleSessionTypeDiscountConfiguration,
} from '@fz-original/app/modules/bundles/models/bundle-configuration.model';
import { BundleDiscountApplicationMode } from '@fz-original/app/modules/bundles/models/bundle-discount-application-mode.model';
import { BundleDiscountType } from '@fz-original/app/modules/bundles/models/bundle-discount-type';
import { BundleFlow } from '@fz-original/app/modules/bundles/models/bundle-flow.model';
import { BundleType } from '@fz-original/app/modules/bundles/models/bundle-type.model';
import { CreateBundleConfigurationBody } from '@fz-original/app/modules/bundles/models/create-bundle-configuration-body.model';
import { UpdateBundleConfigurationBody } from '@fz-original/app/modules/bundles/models/update-bundle-configuration-body.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BundleService {
  #http = inject(HttpClient);
  #partnerService = inject(PartnerService);
  bundleConfiguration: WritableSignal<BundleConfiguration | null> = signal(null);

  createBundleConfiguration(mainPlanId: number, body: CreateBundleConfigurationBody): Observable<null> {
    const url: string = this.#buildUrl(mainPlanId);

    return this.#http.post<BundleConfigurationResponse>(url, body).pipe(
      map((response: BundleConfigurationResponse): null => {
        this.#setBundleConfigurationFromResponse(response, mainPlanId);
        return null;
      }),
      catchError((error: HttpErrorResponse) => {
        throw error;
      }),
    );
  }

  deleteBundleConfiguration(mainPlanId: number): Observable<null> {
    const url: string = this.#buildUrl(mainPlanId);

    return this.#http.delete(url).pipe(
      map((): null => {
        this.bundleConfiguration.set(null);
        return null;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.bundleConfiguration.set(null);
        }
        throw error;
      }),
    );
  }

  getBundleConfiguration(mainPlanId: number): Observable<null> {
    const url: string = this.#buildUrl(mainPlanId);

    return this.#http.get<BundleConfigurationResponse>(url).pipe(
      map((response: BundleConfigurationResponse): null => {
        this.#setBundleConfigurationFromResponse(response, mainPlanId);
        return null;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          this.bundleConfiguration.set(null);
          return of(null);
        }
        throw error;
      }),
    );
  }

  updateBundleConfiguration(mainPlanId: number, body: UpdateBundleConfigurationBody): Observable<null> {
    const url: string = this.#buildUrl(mainPlanId);

    return this.#http.put<BundleConfigurationResponse>(url, body).pipe(
      map((response: BundleConfigurationResponse): null => {
        this.#setBundleConfigurationFromResponse(response, mainPlanId);
        return null;
      }),
      catchError((error: HttpErrorResponse) => {
        throw error;
      }),
    );
  }

  #buildUrl(mainPlanId: number): string {
    const partnerId: number = this.#partnerService.getPartner()!.id;
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${mainPlanId}/bundle-configuration/`;
  }

  #isValidDiscountConfiguration(discount: BundleSessionTypeDiscountConfigurationResponseData): boolean {
    return Object.values(BundleDiscountType).includes(discount.type as BundleDiscountType);
  }

  #mapToBundle(bundleResponseData: BundleResponseData): Bundle {
    const sessionTypeDiscounts: BundleSessionTypeDiscountConfiguration[] = [];
    bundleResponseData.session_type_discounts.forEach((discount: BundleSessionTypeDiscountConfigurationResponseData) => {
      if (!this.#isValidDiscountConfiguration(discount)) {
        return;
      }
      sessionTypeDiscounts.push(this.#mapToBundleSessionTypeDiscountConfiguration(discount));
    });

    return {
      id: bundleResponseData.id,
      mainPlanId: bundleResponseData.main_plan_id,
      order: bundleResponseData.order,
      optional: bundleResponseData.optional,
      isActive: bundleResponseData.is_active,
      color: bundleResponseData.color,
      sessionTypeDiscounts,
    };
  }

  #mapToBundleConfiguration(bundleConfigurationResponseData: BundleConfigurationResponseData, mainPlanId: number): BundleConfiguration {
    return {
      parentMainPlanId: mainPlanId,
      type: this.#mapToBundleType(bundleConfigurationResponseData.type),
      maxDateSelectionSpanInDays: bundleConfigurationResponseData.max_date_selection_span_in_days,
      sessionOffsetMinutes: bundleConfigurationResponseData.session_offset_minutes,
      discountApplicationMode: this.#mapToDiscountApplicationMode(bundleConfigurationResponseData.discount_application_mode),
      flow: this.#mapToBundleFlow(bundleConfigurationResponseData.flow),
      minBundleSize: bundleConfigurationResponseData.min_bundle_size,
      maxBundleSize: bundleConfigurationResponseData.max_bundle_size,
      relatedMainPlans: bundleConfigurationResponseData.related_main_plans.map((bundle: BundleResponseData) => this.#mapToBundle(bundle)),
    };
  }

  #mapToBundleSessionTypeDiscountConfiguration(
    discountResponseData: BundleSessionTypeDiscountConfigurationResponseData,
  ): BundleSessionTypeDiscountConfiguration {
    return {
      id: discountResponseData.id,
      sessionTypeId: discountResponseData.session_type_id,
      type: discountResponseData.type as BundleDiscountType,
      requireMatchingTag: discountResponseData.require_matching_tag,
      quantity: discountResponseData.quantity,
      percentagePaidByPartner: discountResponseData.percentage_paid_by_partner,
      size: discountResponseData.size,
    };
  }

  #isBundleFlow(value: string): value is BundleFlow {
    return Object.values<string>(BundleFlow).includes(value);
  }

  #mapToBundleFlow(responseBundleFlow: string): BundleFlow {
    if (this.#isBundleFlow(responseBundleFlow)) {
      return responseBundleFlow;
    }
    throw new HttpErrorResponse({ error: null, status: 0 });
  }

  #mapToBundleType(responseBundleType: string): BundleType {
    if (Object.values(BundleType).includes(responseBundleType as BundleType)) {
      return responseBundleType as BundleType;
    }
    throw new HttpErrorResponse({ error: null, status: 0 });
  }

  #mapToDiscountApplicationMode(responseDiscountApplicationMode: string): BundleDiscountApplicationMode {
    if (Object.values(BundleDiscountApplicationMode).includes(responseDiscountApplicationMode as BundleDiscountApplicationMode)) {
      return responseDiscountApplicationMode as BundleDiscountApplicationMode;
    }
    throw new HttpErrorResponse({ error: null, status: 0 });
  }

  #setBundleConfigurationFromResponse(response: BundleConfigurationResponse, mainPlanId: number): void {
    const bundleConfiguration: BundleConfiguration = this.#mapToBundleConfiguration(response.bundle_configuration, mainPlanId);
    this.bundleConfiguration.set(bundleConfiguration);
  }
}
