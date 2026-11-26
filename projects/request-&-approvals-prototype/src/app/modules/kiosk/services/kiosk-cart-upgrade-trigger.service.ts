import { inject, Injectable } from '@angular/core';

import { IgntDialogRef, IgntDialogService } from '@ignite/common';
import { catchError, EMPTY, map, Observable, of, switchMap, timeout } from 'rxjs';

import { CartSessionTypeUpgradeBaseData } from '../../../core/tracking/core/events/cart-session-type-upgrade.model';
import { FeatureFlags } from '../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import {
  KioskCartUpgradeModalComponent,
  KioskCartUpgradeModalData,
  KioskCartUpgradeModalResult,
} from '../shared/components/modals/kiosk-cart-upgrade/kiosk-cart-upgrade-modal.component';
import {
  buildApplyUpgradeRequests,
  CartSessionTypeUpgrade,
  CartUpgradeTriggerOutcome,
  computeTotalDelta,
  computeTotalUnits,
  pickRenderableUpgrade,
  UpgradeCartSession,
} from './cart-upgrades/kiosk-cart-upgrades.models';
import { KioskCartUpgradesService } from './cart-upgrades/kiosk-cart-upgrades.service';

const SESSION_STORAGE_KEY_PREFIX = 'kiosk-cart-upgrade-shown:';
const FETCH_TIMEOUT_MS = 4000;
const APPLY_TIMEOUT_MS = 8000;

export interface KioskCartUpgradeTriggerParams {
  cartId: string;
  cartSessions: UpgradeCartSession[];
  locale: string;
  partnerId: number;
}

@Injectable({ providedIn: 'root' })
export class KioskCartUpgradeTriggerService {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #upgradesService = inject(KioskCartUpgradesService);
  readonly #dialogService = inject(IgntDialogService);
  #activeDialogRef: IgntDialogRef<KioskCartUpgradeModalResult> | null = null;
  #cancelled = false;

  cancel(): void {
    if (this.#activeDialogRef) {
      this.#cancelled = true;
      this.#activeDialogRef.close();
      this.#activeDialogRef = null;
    }
  }

  open(params: KioskCartUpgradeTriggerParams): Observable<CartUpgradeTriggerOutcome> {
    if (!this.#isFlagEnabled()) {
      return of({ kind: 'not-shown' });
    }
    if (this.#hasBeenShown(params.cartId)) {
      return of({ kind: 'not-shown' });
    }

    return this.#upgradesService.getCartSessionTypeUpgrades(params.partnerId, params.cartId, params.locale).pipe(
      timeout({ first: FETCH_TIMEOUT_MS, with: () => of(null) }),
      catchError(() => of(null)),
      switchMap(upgrades => {
        if (!upgrades) {
          return of<CartUpgradeTriggerOutcome>({ kind: 'not-shown' });
        }

        const renderable = pickRenderableUpgrade(upgrades, params.cartSessions);
        if (!renderable) {
          return of<CartUpgradeTriggerOutcome>({ kind: 'not-shown' });
        }

        this.#markAsShown(params.cartId);

        const tracking = this.#buildTrackingData(params.cartId, renderable, params.cartSessions);
        const data: KioskCartUpgradeModalData = { cartSessions: params.cartSessions, upgrade: renderable };
        this.#activeDialogRef = this.#dialogService.openModal<KioskCartUpgradeModalResult, KioskCartUpgradeModalData>(
          KioskCartUpgradeModalComponent,
          { data },
        );

        return this.#activeDialogRef.closed$.pipe(
          switchMap((result): Observable<CartUpgradeTriggerOutcome> => {
            this.#activeDialogRef = null;
            if (this.#cancelled) {
              this.#cancelled = false;
              return EMPTY;
            }
            const action = result ?? 'close';

            if (action !== 'add') {
              return of({ kind: action, tracking });
            }

            const upgradeRequests = buildApplyUpgradeRequests(renderable, params.cartSessions);
            if (upgradeRequests.length === 0) {
              return of({ kind: 'add-failed', tracking });
            }

            return this.#upgradesService
              .applySessionTypeUpgrade(params.partnerId, params.cartId, upgradeRequests, renderable.targetMainPlanId)
              .pipe(
                timeout(APPLY_TIMEOUT_MS),
                map(
                  (cart): CartUpgradeTriggerOutcome => ({
                    apply_requests_count: upgradeRequests.length,
                    cart,
                    kind: 'add-applied',
                    targetMainPlanId: renderable.targetMainPlanId,
                    tracking,
                  }),
                ),
                catchError(() => of<CartUpgradeTriggerOutcome>({ kind: 'add-failed', tracking })),
              );
          }),
        );
      }),
    );
  }

  #buildTrackingData(
    cartId: string,
    renderable: CartSessionTypeUpgrade,
    cartSessions: UpgradeCartSession[],
  ): CartSessionTypeUpgradeBaseData {
    return {
      add_on_options_count: renderable.addOnOptions.length,
      add_on_source_session_ids: renderable.addOnOptions.map(o => o.sourceSessionId),
      add_on_target_session_ids: renderable.addOnOptions.map(o => o.targetSessionId),
      cart_id: cartId,
      currency: renderable.currency,
      options_count: renderable.options.length,
      source_session_ids: renderable.options.map(o => o.sourceSessionId),
      target_session_ids: renderable.options.map(o => o.targetSessionId),
      total_delta: computeTotalDelta(renderable, cartSessions),
      total_units: computeTotalUnits(renderable, cartSessions),
      upgrade_id: renderable.id,
      upgrade_scheduling_days: renderable.upgradeSchedulingDays,
      upgrade_title: renderable.title,
    };
  }

  #hasBeenShown(cartId: string): boolean {
    try {
      return sessionStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}${cartId}`) === 'true';
    } catch {
      return false;
    }
  }

  #isFlagEnabled(): boolean {
    try {
      return (
        this.#optimizelyService.isFeatureEnabled({
          optimizelyFeatureKey: FeatureFlags.KIOSK_CART_SESSION_TYPE_UPGRADES,
          team: 'parks',
        }) === true
      );
    } catch {
      return false;
    }
  }

  #markAsShown(cartId: string): void {
    try {
      sessionStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${cartId}`, 'true');
    } catch {
      // intentionally empty
    }
  }
}
