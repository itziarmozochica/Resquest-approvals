import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';

@Injectable({
  providedIn: 'root',
})
export class DynamicPricingPermissionsService {
  readonly #destroyRef = inject(DestroyRef);
  readonly #userService = inject(UserService);
  readonly #canViewDynamicPricingRules = signal(this.#resolveCanViewDynamicPricingRules());
  readonly isDynamicPricingEnabled = computed<boolean>(() => this.#canViewDynamicPricingRules());

  constructor() {
    this.#userService
      .observePermissions()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#canViewDynamicPricingRules.set(this.#resolveCanViewDynamicPricingRules());
      });
  }

  #resolveCanViewDynamicPricingRules(): boolean {
    return this.#userService.hasPermission(Permissions.CAN_VIEW_DYNAMIC_PRICING_RULES);
  }
}
