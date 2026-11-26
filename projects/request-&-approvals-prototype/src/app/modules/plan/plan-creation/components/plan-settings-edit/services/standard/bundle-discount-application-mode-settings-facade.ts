import { inject, Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';

import {
  Bundle,
  BundleConfiguration,
  BundleSessionTypeDiscountConfiguration,
} from '@fz-original/app/modules/bundles/models/bundle-configuration.model';
import { BundleDiscountApplicationMode } from '@fz-original/app/modules/bundles/models/bundle-discount-application-mode.model';
import { BundleType } from '@fz-original/app/modules/bundles/models/bundle-type.model';
import {
  UpdateBundleConfigurationBody,
  UpdateBundleConfigurationBodyContentBundle,
  UpdateBundleConfigurationBodyContentSessionTypeDiscountConfiguration,
} from '@fz-original/app/modules/bundles/models/update-bundle-configuration-body.model';
import { BundleService } from '@fz-original/app/modules/bundles/services/bundle.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BundleDiscountApplicationModeSettingsFacade {
  readonly #bundleService = inject(BundleService);
  readonly #userService = inject(UserService);

  loadBundleDiscountApplicationMode(mainPlanId: number, control: FormControl<boolean> | null): Observable<boolean> {
    if (control === null || !this.#userService.getUser()?.isStaff()) {
      return of(false);
    }

    return this.#bundleService.getBundleConfiguration(mainPlanId).pipe(
      map((): boolean => {
        const bundleConfiguration: BundleConfiguration | null = this.#bundleService.bundleConfiguration();
        if (bundleConfiguration === null || bundleConfiguration.type !== BundleType.BUNDLE) {
          return false;
        }

        control.setValue(bundleConfiguration.discountApplicationMode === BundleDiscountApplicationMode.MIN_TICKETS_ACROSS_PLANS, {
          emitEvent: false,
        });

        return true;
      }),
      catchError(() => of(false)),
    );
  }

  syncBundleDiscountApplicationModeIfDirty(mainPlanId: number, control: FormControl<boolean> | null): Observable<void> {
    const bundleConfiguration: BundleConfiguration | null = this.#bundleService.bundleConfiguration();

    if (control === null || !control.dirty || bundleConfiguration === null) {
      return of(void 0);
    }

    const discountApplicationMode: BundleDiscountApplicationMode = control.value
      ? BundleDiscountApplicationMode.MIN_TICKETS_ACROSS_PLANS
      : BundleDiscountApplicationMode.ALL_TICKETS_PER_SESSION;

    const body = this.#buildUpdateBundleConfigurationBody(bundleConfiguration, discountApplicationMode);

    return this.#bundleService.updateBundleConfiguration(mainPlanId, body).pipe(map((): void => control.markAsPristine()));
  }

  #buildUpdateBodyBundle(bundle: Bundle): UpdateBundleConfigurationBodyContentBundle {
    return {
      color: bundle.color,
      id: bundle.id,
      is_active: bundle.isActive,
      main_plan_id: bundle.mainPlanId,
      order: bundle.order,
      session_type_discounts: bundle.sessionTypeDiscounts.map(
        (discount: BundleSessionTypeDiscountConfiguration): UpdateBundleConfigurationBodyContentSessionTypeDiscountConfiguration => ({
          id: discount.id,
          percentage_paid_by_partner: discount.percentagePaidByPartner,
          quantity: discount.quantity,
          require_matching_tag: discount.requireMatchingTag,
          session_type_id: discount.sessionTypeId,
          size: discount.size,
          type: discount.type,
        }),
      ),
    };
  }

  #buildUpdateBundleConfigurationBody(
    bundleConfiguration: BundleConfiguration,
    discountApplicationMode: BundleDiscountApplicationMode,
  ): UpdateBundleConfigurationBody {
    return {
      bundle_configuration: {
        discount_application_mode: discountApplicationMode,
        flow: bundleConfiguration.flow,
        max_bundle_size: bundleConfiguration.maxBundleSize,
        max_date_selection_span_in_days: bundleConfiguration.maxDateSelectionSpanInDays,
        min_bundle_size: bundleConfiguration.minBundleSize,
        related_main_plans: bundleConfiguration.relatedMainPlans.map((bundle: Bundle) => this.#buildUpdateBodyBundle(bundle)),
        session_offset_minutes: bundleConfiguration.sessionOffsetMinutes,
        type: bundleConfiguration.type,
      },
    };
  }
}
