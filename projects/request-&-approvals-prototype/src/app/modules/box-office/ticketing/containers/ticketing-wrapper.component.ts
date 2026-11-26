import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { DiscardCartQuery } from '@fz-original/app/shared/services/cart/discard-cart-query';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { fromEvent, Observable, of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';

import {
  unsavedCartChangesModalConfig,
  WithBeforeUnloadHostHandlers,
  WithUnsavedChangesGuardComponent,
} from '../../../../shared/models/with-unsaved-changes-guard-component.model';
import { discardOnPageHideIfUnsavedChanges, preventUnloadIfUnsavedChanges } from '../../../../shared/utils/cart-unsaved-changes.util';
import { OneStopShopComponent } from '../../one-stop-shop/containers/one-stop-shop.component';
import { OssOnsiteSetupModalComponent } from '../../one-stop-shop/containers/oss-onsite-setup-modal/oss-onsite-setup-modal.component';
import { OSSConfigStorageService } from '../../one-stop-shop/services/oss-config-storage.service';
import { OboFlowTypeEnum, OnsiteSetup } from '../../shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '../../shared/services/onsite-setups/onsite-setups-storage.service';
import { OnsiteSetupsService } from '../../shared/services/onsite-setups/onsite-setups.service';
import { BoxOfficeTicketingComponent } from '../box-office-ticketing.component';
import { TicketingUnsavedChangesBypassService } from '../services/ticketing-unsaved-changes-bypass.service';
import { UserShiftService } from '../services/user-shift/user-shift.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:beforeunload)': 'showConfirmOnReload($event)',
    '(window:pagehide)': 'onPageHide($event)',
  },
  providers: [TicketingUnsavedChangesBypassService],
  selector: 'app-ticketing-wrapper',
  standalone: false,
  styleUrl: './ticketing-wrapper.component.scss',
  templateUrl: 'ticketing-wrapper.component.html',
})
export class TicketingWrapperComponent implements OnInit, WithBeforeUnloadHostHandlers, WithUnsavedChangesGuardComponent {
  #activatedRoute = inject(ActivatedRoute);
  #cartService = inject(CartService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  #destroyRef = inject(DestroyRef);
  #modalService = inject(NgbModal);
  #ticketingUnsavedChangesBypass = inject(TicketingUnsavedChangesBypassService);
  #onsiteSetupsService = inject(OnsiteSetupsService);
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #ossConfigStorageService = inject(OSSConfigStorageService);
  #router = inject(Router);
  #userService = inject(UserService);
  #userShiftService = inject(UserShiftService);

  isFlowResolved = false;
  isOneStopShopFlow = false;
  @ViewChild(OneStopShopComponent) oneStopShopComponent?: OneStopShopComponent;
  @ViewChild(BoxOfficeTicketingComponent) boxOfficeTicketingComponent?: BoxOfficeTicketingComponent;

  readonly unsavedChangesModalConfig = unsavedCartChangesModalConfig;

  areChangesUnsaved = (): boolean =>
    this.isOneStopShopFlow
      ? this.oneStopShopComponent?.cartHasItems?.() === true
      : this.boxOfficeTicketingComponent?.cartHasItems?.() === true;

  acceptFunction = (): Observable<void> =>
    this.isOneStopShopFlow
      ? (this.oneStopShopComponent?.discardCartBeforeNavigation?.() ?? of(void 0))
      : (this.boxOfficeTicketingComponent?.discardCartBeforeNavigation?.() ?? of(void 0));

  getUnloadDiscardCartQuery = (): DiscardCartQuery | null =>
    this.isOneStopShopFlow
      ? (this.oneStopShopComponent?.getUnloadDiscardCartQuery?.() ?? null)
      : (this.boxOfficeTicketingComponent?.getUnloadDiscardCartQuery?.() ?? null);

  shouldBypassUnsavedChangesGuard = (): boolean => this.#ticketingUnsavedChangesBypass.consumePendingBypass();

  releaseSeats = (): void => {
    const child = this.isOneStopShopFlow ? this.oneStopShopComponent : this.boxOfficeTicketingComponent;
    if ((child?.seatingSelectorRef?.seatsCounter ?? 0) > 0) {
      child?.seatingSelectorRef?.clearSelection({ expireHoldToken: true });
    }
  };

  showConfirmOnReload = preventUnloadIfUnsavedChanges;
  onPageHide = (event: PageTransitionEvent): void => {
    if (this.#ticketingUnsavedChangesBypass.hasPendingBypass()) {
      return;
    }
    discardOnPageHideIfUnsavedChanges(this, this.#cartService, event);
  };

  ngOnInit(): void {
    this.#resolveOnsiteSetup();
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(
        filter(event => event.key === this.#onsiteSetupsStorageService.ONSITE_SETUP_CONFIG),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => this.#resolveActiveOnsiteSetup());
  }

  #persistOnsiteSetupSelection(onsiteSetup: OnsiteSetup): void {
    const effectiveOnsiteSetup = { ...onsiteSetup, obo_flow_type: OboFlowTypeEnum.one_stop_shop };
    const userId = this.#userService.getUser()?.id;
    const onsiteSetupWithUser = userId ? ({ ...effectiveOnsiteSetup, user_id: userId } as OnsiteSetup) : effectiveOnsiteSetup;
    this.#onsiteSetupsStorageService.setConfiguration(onsiteSetupWithUser);

    const currentConfig = this.#ossConfigStorageService.getConfiguration() ?? ({} as any);
    this.#ossConfigStorageService.setConfiguration({
      ...currentConfig,
      onsiteSetup: {
        cityId: effectiveOnsiteSetup.place?.city_id ?? currentConfig?.onsiteSetup?.cityId ?? null,
        id: effectiveOnsiteSetup.id,
        placeId: Number(effectiveOnsiteSetup.place?.id ?? effectiveOnsiteSetup.place_id ?? 0),
        placeName: effectiveOnsiteSetup.place?.name ?? currentConfig?.onsiteSetup?.placeName ?? '',
      },
    });
  }

  #resolveActiveOnsiteSetup(): void {
    const storedOnsiteSetup: OnsiteSetup | null = this.#onsiteSetupsStorageService.getConfiguration();
    const shouldPersistOneStopShopFlow = storedOnsiteSetup !== null && storedOnsiteSetup.obo_flow_type !== OboFlowTypeEnum.one_stop_shop;
    const currentOnsiteSetup: OnsiteSetup | null = shouldPersistOneStopShopFlow
      ? { ...storedOnsiteSetup, obo_flow_type: OboFlowTypeEnum.one_stop_shop }
      : storedOnsiteSetup;

    if (shouldPersistOneStopShopFlow && currentOnsiteSetup !== null) {
      this.#onsiteSetupsStorageService.setConfiguration(currentOnsiteSetup);
    }

    this.isOneStopShopFlow = true;
    this.isFlowResolved = true;
    this.#changeDetectorRef.markForCheck();
  }

  #resolveOnsiteSetup(): void {
    const onsiteSetupIdFromUrl = this.#activatedRoute.snapshot.queryParams['onsiteSetupId'];
    const currentOnsiteSetup: OnsiteSetup | null = this.#onsiteSetupsStorageService.getConfiguration();
    const shouldLoadFromUrl = onsiteSetupIdFromUrl && currentOnsiteSetup?.id !== onsiteSetupIdFromUrl;

    if (shouldLoadFromUrl) {
      this.#userShiftService
        .getOpenedShift()
        .pipe(
          switchMap(openedShift => {
            const hasMismatch = Boolean(openedShift?.onsiteSetupId && openedShift.onsiteSetupId !== onsiteSetupIdFromUrl);
            const targetId = (hasMismatch ? openedShift!.onsiteSetupId : onsiteSetupIdFromUrl) as string;

            return this.#onsiteSetupsService.getOnsiteSetup(targetId).pipe(map(setup => ({ isMismatch: hasMismatch, onsiteSetup: setup })));
          }),
        )
        .subscribe({
          error: () => {
            this.#resolveActiveOnsiteSetup();
          },
          next: ({ isMismatch, onsiteSetup }) => {
            if (isMismatch) {
              this.#showEndShiftRequiredModal();
              this.#router.navigate([], {
                queryParams: { onsiteSetupId: onsiteSetup.id },
                queryParamsHandling: 'merge',
                replaceUrl: true,
              });
              this.#persistOnsiteSetupSelection(onsiteSetup);
              this.#changeDetectorRef.markForCheck();
            } else {
              this.#persistOnsiteSetupSelection(onsiteSetup);
              this.#resolveActiveOnsiteSetup();
            }
          },
        });
    } else {
      this.#resolveActiveOnsiteSetup();
    }
  }

  #showEndShiftRequiredModal(): void {
    const modal = this.#modalService.open(OssOnsiteSetupModalComponent, {
      backdrop: true,
      keyboard: true,
      modalDialogClass: 'oss-onsite-setup-selector-modal',
    });
    modal.componentInstance.hasCloseButton = true;
    modal.componentInstance.hasActiveShiftAndActiveOnsiteSetup = true;
  }
}
