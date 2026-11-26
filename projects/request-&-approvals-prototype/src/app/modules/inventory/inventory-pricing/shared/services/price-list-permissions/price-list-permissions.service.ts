import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PlanEditionLockService } from '@fz-original/app/shared/services/plan-review/plan-edition-lock.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class PriceListPermissionsService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #planEditionLockService = inject(PlanEditionLockService);
  readonly #userService = inject(UserService);
  readonly #hasModifyPermissions = signal(this.#resolveHasModifyPermissions());
  readonly #canModifyPriceListsGranted = signal(this.#resolveCanModifyPriceListsGranted());
  readonly #canViewPriceLists = signal(this.#resolveCanViewPriceLists());
  readonly #canViewTimeslots = signal(this.#resolveCanViewTimeslots());
  readonly #canEditSurcharge = signal(this.#evaluateCanEditSurcharge());
  readonly canEditSurcharge = this.#canEditSurcharge.asReadonly();
  readonly #canEditB2bDiscount = signal(this.#evaluateCanEditB2bDiscount());
  readonly canEditB2bDiscount = this.#canEditB2bDiscount.asReadonly();
  readonly canModifyPricesPerTimeslot = this.#canModifyPriceListsGranted.asReadonly();
  readonly canModifyPriceLists = computed<boolean>(
    () => this.#hasModifyPermissions() && !this.#planEditionLockService.isLockedForEdition(),
  );
  readonly isPriceListsEnabled = computed<boolean>(() => this.#canViewPriceLists() || this.#canModifyPriceListsGranted());
  readonly isPricesPerTimeslotEnabled = computed<boolean>(
    () =>
      (this.isPriceListsEnabled() || this.#canViewTimeslots()) &&
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.FORCE_DISPLAY_PRICE_IN_SESSIONS_PER_TIMESLOT) === false,
  );

  constructor() {
    this.#userService
      .observePermissions()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#hasModifyPermissions.set(this.#resolveHasModifyPermissions());
        this.#canModifyPriceListsGranted.set(this.#resolveCanModifyPriceListsGranted());
        this.#canViewPriceLists.set(this.#resolveCanViewPriceLists());
        this.#canViewTimeslots.set(this.#resolveCanViewTimeslots());
        this.#canEditSurcharge.set(this.#evaluateCanEditSurcharge());
        this.#canEditB2bDiscount.set(this.#evaluateCanEditB2bDiscount());
      });
  }

  #evaluateCanEditB2bDiscount(): boolean {
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.CAN_EDIT_PRICE_ITEM_B2B_DISCOUNT) === true;
  }

  #evaluateCanEditSurcharge(): boolean {
    return (
      this.#userService.hasPermission(Permissions.CAN_MODIFY_PRICE_LISTS_SURCHARGE) ||
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.CAN_EDIT_PRICE_ITEM_SURCHARGE) === true
    );
  }

  #resolveCanModifyPriceListsGranted(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_MODIFY_PRICE_LISTS);
  }

  #resolveCanViewPriceLists(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_VIEW_PRICE_LISTS);
  }

  #resolveCanViewTimeslots(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_VIEW_TIMESLOTS);
  }

  #resolveHasModifyPermissions(): boolean {
    return (
      this.#resolveCanModifyPriceListsGranted() ||
      this.#userService.hasPermission(Permissions.CAN_CREATE_PLANS) ||
      this.#userService.hasPermission(Permissions.CAN_MANAGE_PLAN_REVIEWS)
    );
  }
}
