import { ChangeDetectionStrategy, Component, computed, DestroyRef, DOCUMENT, inject, input, linkedSignal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import type { OdooOrderTab } from '@fz-original/app/modules/box-office/odoo-food-and-beverage/models/odoo-order-tab.model';
import { OdooPosHandoffService } from '@fz-original/app/modules/box-office/odoo-food-and-beverage/services/odoo-pos-handoff.service';
import { OdooPosLinkService } from '@fz-original/app/modules/box-office/odoo-food-and-beverage/services/odoo-pos-link.service';
import {
  getCreateOrderTabsErrorKey,
  isOrderWithoutTabsError,
} from '@fz-original/app/modules/box-office/odoo-food-and-beverage/utils/order-tabs-error.util';
import type { Order } from '@fz-original/app/shared/models/order/order.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { isCancelledOrderStatus } from '@fz-original/app/shared/utils/order-status.util';
import { IgntButtonComponent, IgntToastService } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, combineLatest, map, of, skip, startWith, switchMap, takeUntil } from 'rxjs';

import type { OrderPosTabCard } from './models/order-pos-tab-card.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:pageshow)': 'onPageShow($event)',
    '[hidden]': 'isHidden()',
  },
  imports: [IgntButtonComponent, IgntIconButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-order-pos-tabs',
  styleUrl: './order-pos-tabs.component.scss',
  templateUrl: './order-pos-tabs.component.html',
})
export class OrderPosTabsComponent {
  readonly order = input<Order>();
  readonly orderDetailLayout = input<boolean>(false);

  readonly #destroyRef = inject(DestroyRef);
  readonly #document = inject(DOCUMENT);
  readonly #odooPosLinkService = inject(OdooPosLinkService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #posHandoffService = inject(OdooPosHandoffService);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  readonly #canOpenOdooTab = toSignal(
    combineLatest([this.#optimizelyService.observeUserData(), this.#userService.observePermissions()]).pipe(
      map(() => this.#allowsOdooTab()),
    ),
    { initialValue: false },
  );
  readonly #tabLinkOrderId = computed((): number | null => {
    const orderId = this.order()?.id;
    if (!this.#canOpenOdooTab() || this.order()?.hasShopsEntitlement !== true || orderId === undefined) {
      return null;
    }

    return orderId;
  });
  readonly #openingTabId = linkedSignal<number | null, string | null>({
    source: this.#tabLinkOrderId,
    computation: () => null,
  });
  readonly #expandedTabIds = linkedSignal<number | null, ReadonlySet<string>>({
    source: this.#tabLinkOrderId,
    computation: () => new Set<string>(),
  });
  readonly #tabLinkOrderId$ = toObservable(this.#tabLinkOrderId);
  readonly #loadedTabs = toSignal(
    this.#tabLinkOrderId$.pipe(
      switchMap((orderId: number | null) => {
        if (orderId === null) {
          return of(null);
        }

        return this.#odooPosLinkService.getOrderTabs(orderId).pipe(
          startWith(null),
          catchError((error: unknown) => of(isOrderWithoutTabsError(error) ? [] : null)),
        );
      }),
    ),
    { initialValue: null },
  );
  readonly #orderTabs = linkedSignal<OdooOrderTab[] | null>(() => this.#loadedTabs());
  readonly #isCreatingTabs = linkedSignal<number | null, boolean>({
    source: this.#tabLinkOrderId,
    computation: () => false,
  });

  protected readonly isCreatingTabs = this.#isCreatingTabs.asReadonly();
  protected readonly tabs = computed((): OrderPosTabCard[] => {
    const expandedTabIds = this.#expandedTabIds();
    const openingTabId = this.#openingTabId();

    return (this.#orderTabs() ?? []).map((tab: OdooOrderTab): OrderPosTabCard => {
      const name = tab.name?.trim() ?? '';

      return {
        ...tab,
        isCollapsed: !expandedTabIds.has(tab.id),
        isOpening: tab.id === openingTabId,
        name: name.length > 0 ? name : null,
      };
    });
  });
  protected readonly isEmpty = computed(() => this.#orderTabs()?.length === 0);
  protected readonly canSyncTabs = computed(() => !isCancelledOrderStatus(this.order()?.status));
  protected readonly isVisible = computed(() => this.#orderTabs() !== null && (!this.isEmpty() || this.canSyncTabs()));
  protected readonly isHidden = computed(() => !this.isVisible());
  protected readonly chevronIcon: IconProp = ['fas', 'chevron-down'];

  protected createTabs(): void {
    const orderId = this.#tabLinkOrderId();

    if (orderId === null || this.isCreatingTabs() || !this.canSyncTabs()) {
      return;
    }

    const hadTabs = !this.isEmpty();
    this.#isCreatingTabs.set(true);
    this.#odooPosLinkService
      .createOrderTabs(orderId)
      .pipe(takeUntil(this.#tabLinkOrderId$.pipe(skip(1))), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => {
          this.#isCreatingTabs.set(false);
          this.#toastService.danger(this.#translateService.instant(getCreateOrderTabsErrorKey(error)));
        },
        next: (tabs: OdooOrderTab[]) => {
          this.#isCreatingTabs.set(false);
          this.#orderTabs.set(tabs);
          this.#showCreatedTabsToast(tabs, hadTabs);
        },
      });
  }

  protected onPageShow(event: PageTransitionEvent): void {
    if (event.persisted) {
      this.#openingTabId.set(null);
    }
  }

  protected openTab(tab: OdooOrderTab): void {
    if (this.#openingTabId() !== null) {
      return;
    }

    const organizationId = this.#partnerService.getActingOrganizationId();

    if (organizationId === null) {
      this.#showError();

      return;
    }

    this.#openingTabId.set(tab.id);
    this.#posHandoffService
      .resolveTabRedirectUrl(tab.id, organizationId)
      .pipe(takeUntil(this.#tabLinkOrderId$.pipe(skip(1))), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {
          this.#openingTabId.set(null);
          this.#showError();
        },
        next: (redirectUrl: string) => {
          this.#document.defaultView?.location.assign(redirectUrl);
        },
      });
  }

  protected toggleTab(tab: OrderPosTabCard): void {
    this.#expandedTabIds.update((expandedTabIds: ReadonlySet<string>) => {
      const next = new Set(expandedTabIds);
      if (!next.delete(tab.id)) {
        next.add(tab.id);
      }

      return next;
    });
  }

  #allowsOdooTab(): boolean {
    const posSubsectionEnabled =
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.CAN_VIEW_ODOO_POS_SUBSECTION,
        team: 'b2b-shops',
      }) === true;

    const hasBoxOfficePermission = this.#userService.hasPermission(Permissions.CAN_VIEW_BOX_OFFICE);

    return posSubsectionEnabled && hasBoxOfficePermission;
  }

  #showCreatedTabsToast(tabs: OdooOrderTab[], hadTabs: boolean): void {
    if (tabs.length === 0) {
      this.#toastService.warning(this.#translateService.instant('boxOffice.order.posTabs.createEmptyWarning'));

      return;
    }

    const successKey = hadTabs ? 'boxOffice.order.posTabs.syncSuccess' : 'boxOffice.order.posTabs.createSuccess';
    this.#toastService.positive(this.#translateService.instant(successKey));
  }

  #showError(): void {
    this.#toastService.danger(this.#translateService.instant('boxOffice.order.posTabs.openError'));
  }
}
