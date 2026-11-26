import { inject } from '@angular/core';

import { OnsiteSetupsPresetCouponsService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups-preset-coupons/onsite-setups-preset-coupons.service';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';

import { initialState, type CouponCodeSelectorStoreState } from './models/coupon-code-selector-store.model';

export const CouponCodeSelectorStore = signalStore(
  withState<CouponCodeSelectorStoreState>(initialState),
  withMethods((store, onsiteSetupService = inject(OnsiteSetupsPresetCouponsService)) => {
    const loadPresetsForOnsiteSetup = rxMethod<string>(
      pipe(
        switchMap(onsiteSetupId => {
          patchState(store, { isLoadingPresets: true });
          return onsiteSetupService.getPresetCouponsByOnsiteSetupId(onsiteSetupId).pipe(
            tap(preset => {
              patchState(store, {
                isLoadingPresets: false,
                lazyCoupons: preset.lazyCoupons,
                presetCoupons: preset.coupons,
              });
            }),
            catchError(() => {
              patchState(store, { isLoadingPresets: false });
              return of(null);
            }),
          );
        }),
      ),
    );

    return {
      loadPresetsForOnsiteSetup,
      clearApplyingPreset(): void {
        patchState(store, { isApplyingPreset: false });
      },
      notifySearchInteraction(): void {
        patchState(store, { searchInteractionNonce: store.searchInteractionNonce() + 1 });
      },
      selectPresetCoupon(code: string): void {
        patchState(store, {
          isApplyingPreset: true,
          presetCouponSelection: {
            code,
            nonce: (store.presetCouponSelection()?.nonce ?? 0) + 1,
          },
        });
      },
    };
  }),
);
